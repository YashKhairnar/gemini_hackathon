import os
import pty
import select
import subprocess
import eventlet
import fcntl
import struct
import termios
from datetime import datetime

class TerminalSession:
    """Manages a single PTY terminal session"""

    def __init__(self, session_id, working_dir, socket_io, client_sid, namespace='/', venv_path=None):
        self.session_id = session_id
        self.working_dir = working_dir
        self.socket_io = socket_io
        self.client_sid = client_sid  # Store the client's socket ID
        self.namespace = namespace
        self.venv_path = venv_path  # Optional: explicitly provided venv path
        self.master_fd = None
        self.process = None
        self.thread = None
        self.running = False

    def _find_venv(self, directory):
        """Find virtual environment in directory or parent directories"""
        # First, check for ide_backend venv (project-specific venv)
        ide_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ide_backend_venv = os.path.join(ide_backend_dir, 'ide_backend', 'venv')
        if os.path.exists(os.path.join(ide_backend_venv, 'bin', 'activate')):
            return ide_backend_venv
        
        # Also check in ide_backend directory itself (if running from there)
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        venv_in_backend = os.path.join(current_file_dir, 'venv')
        if os.path.exists(os.path.join(venv_in_backend, 'bin', 'activate')):
            return venv_in_backend
        
        # Fallback: check standard venv locations in workspace
        venv_paths = ['venv', '.venv', 'env', '.env', 'virtualenv']
        current_dir = os.path.abspath(directory) if directory else os.getcwd()
        
        # Check current directory and parent directories (up to 3 levels up)
        for _ in range(4):
            for venv_name in venv_paths:
                venv_path = os.path.join(current_dir, venv_name)
                activate_script = os.path.join(venv_path, 'bin', 'activate')
                if os.path.exists(activate_script):
                    return venv_path
            # Move to parent directory
            parent_dir = os.path.dirname(current_dir)
            if parent_dir == current_dir:  # Reached root
                break
            current_dir = parent_dir
        
        return None

    def start(self):
        """Start the PTY terminal session"""
        try:
            # Create a pseudo-terminal
            master_fd, slave_fd = pty.openpty()
            self.master_fd = master_fd

            # Set terminal size
            self._set_terminal_size(80, 24)

            # Find virtual environment (use explicit venv_path if provided, otherwise search)
            if self.venv_path and os.path.exists(os.path.join(self.venv_path, 'bin', 'activate')):
                venv_path = self.venv_path
            else:
                venv_path = self._find_venv(self.working_dir)
            
            # Start shell process
            env = os.environ.copy()
            env['TERM'] = 'xterm-256color'
            
            # Enhanced PS1 that shows venv status
            if venv_path:
                venv_name = os.path.basename(venv_path)
                env['PS1'] = f'\\[\\033[01;32m\\]({venv_name})\\[\\033[00m\\] \\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
                # Store venv path for later activation
                env['IDE_VENV_PATH'] = venv_path
            else:
                env['PS1'] = '\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '

            self.process = subprocess.Popen(
                ['/bin/bash'],
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                env=env,
                cwd=self.working_dir,
                preexec_fn=os.setsid
            )

            # Close slave fd in parent process
            os.close(slave_fd)

            # Set non-blocking mode for master fd
            flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
            fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Start reading greenthread (eventlet compatible)
            self.running = True
            self.thread = eventlet.spawn(self._read_output)
            
            # If venv found, activate it by writing to the terminal after a short delay
            # This allows bash to fully initialize before we send the activation command
            if venv_path:
                def activate_venv():
                    eventlet.sleep(0.3)  # Wait for bash to be ready (eventlet-friendly sleep)
                    activate_script = os.path.join(venv_path, 'bin', 'activate')
                    activation_cmd = f'source "{activate_script}"\n'
                    self.write_input(activation_cmd)
                
                # Use eventlet to schedule the activation in the background
                eventlet.spawn(activate_venv)

            return True
        except Exception as e:
            print(f"Error starting terminal session: {e}")
            return False

    def _set_terminal_size(self, cols, rows):
        """Set the terminal window size"""
        if self.master_fd:
            size = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, size)

    def _read_output(self):
        """Read output from the PTY and send to client"""
        while self.running:
            try:
                # Use eventlet-friendly select
                r, _, _ = eventlet.green.select.select([self.master_fd], [], [], 0.1)

                if r:
                    try:
                        data = os.read(self.master_fd, 1024)
                        if data:
                            output = data.decode('utf-8', errors='replace')
                            print(f"[Terminal {self.session_id}] Read output: {repr(output)}")
                            # Send output to specific client via WebSocket
                            # Use 'to=' parameter for Flask-SocketIO room targeting
                            self.socket_io.emit('terminal_output', {
                                'session_id': self.session_id,
                                'data': output
                            }, to=self.client_sid)
                            print(f"[Terminal {self.session_id}] Emitted output to client {self.client_sid}")
                    except OSError as e:
                        # Process might have exited
                        print(f"[Terminal {self.session_id}] OSError reading output: {e}")
                        break
                else:
                    # Yield to other greenthreads when no data
                    eventlet.sleep(0)

                # Check if process is still running
                if self.process and self.process.poll() is not None:
                    self.running = False
                    break

            except Exception as e:
                print(f"Error reading terminal output: {e}")
                break

        self._cleanup()

    def write_input(self, data):
        """Write input to the PTY"""
        if self.master_fd and self.running:
            try:
                print(f"[Terminal {self.session_id}] Writing input: {repr(data)}")
                os.write(self.master_fd, data.encode('utf-8'))
                print(f"[Terminal {self.session_id}] Input written successfully")
            except Exception as e:
                print(f"Error writing to terminal: {e}")
        else:
            print(f"[Terminal {self.session_id}] Cannot write - master_fd={self.master_fd}, running={self.running}")

    def resize(self, cols, rows):
        """Resize the terminal"""
        self._set_terminal_size(cols, rows)

    def _cleanup(self):
        """Clean up resources"""
        self.running = False

        if self.master_fd:
            try:
                os.close(self.master_fd)
            except:
                pass
            self.master_fd = None

        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except:
                try:
                    self.process.kill()
                except:
                    pass
            self.process = None

    def stop(self):
        """Stop the terminal session"""
        self.running = False
        if self.thread:
            # Kill the eventlet greenthread
            self.thread.kill()
        self._cleanup()


class TerminalManager:
    """Manages multiple terminal sessions"""

    def __init__(self, socket_io, default_working_dir=None, default_venv_path=None):
        self.socket_io = socket_io
        self.sessions = {}
        # Use provided working directory or fallback to home directory
        if default_working_dir and os.path.exists(default_working_dir):
            self.default_working_dir = default_working_dir
        else:
            self.default_working_dir = os.path.expanduser('~')
        # Store default venv path
        self.default_venv_path = default_venv_path

    def create_session(self, session_id=None, working_dir=None, client_sid=None):
        """Create a new terminal session"""
        if session_id is None:
            session_id = f"term_{len(self.sessions)}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        if working_dir is None:
            working_dir = self.default_working_dir

        # Ensure working directory exists
        if not os.path.exists(working_dir):
            working_dir = self.default_working_dir

        # Use default venv path if available
        venv_path = self.default_venv_path
        session = TerminalSession(session_id, working_dir, self.socket_io, client_sid, venv_path=venv_path)

        if session.start():
            self.sessions[session_id] = session
            return session_id

        return None

    def get_session(self, session_id):
        """Get a terminal session by ID"""
        return self.sessions.get(session_id)

    def send_input(self, session_id, data):
        """Send input to a terminal session"""
        session = self.get_session(session_id)
        if session:
            session.write_input(data)
            return True
        return False

    def resize_session(self, session_id, cols, rows):
        """Resize a terminal session"""
        session = self.get_session(session_id)
        if session:
            session.resize(cols, rows)
            return True
        return False

    def close_session(self, session_id):
        """Close a terminal session"""
        session = self.sessions.pop(session_id, None)
        if session:
            session.stop()
            return True
        return False

    def close_all_sessions(self):
        """Close all terminal sessions"""
        for session in list(self.sessions.values()):
            session.stop()
        self.sessions.clear()
