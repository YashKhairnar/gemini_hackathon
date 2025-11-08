from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import os
import logging
from terminal_manager import TerminalManager
from file_manager import FileManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO with increased timeout settings
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=120,      # Wait 120 seconds for pong before closing
    ping_interval=25,      # Send ping every 25 seconds
    engineio_logger=False,
    logger=False
)

# Initialize managers
# Set workspace to agentapp outputs directory
# Get the project root (parent of ide_backend directory)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
outputs_path = os.path.join(project_root, 'agentapp', 'src', 'agentapp', 'outputs')

# Use outputs directory if it exists, otherwise fallback to project root
if os.path.exists(outputs_path):
    workspace_path = outputs_path
    logger.info(f'Using agent outputs directory: {workspace_path}')
else:
    workspace_path = project_root
    logger.warning(f'Outputs directory not found at {outputs_path}, using project root: {workspace_path}')

file_manager = FileManager(workspace_root=workspace_path)
logger.info(f'File manager initialized with workspace: {file_manager.workspace_root}')

# Initialize terminal manager with workspace root as default working directory
terminal_manager = TerminalManager(socketio, default_working_dir=workspace_path)
logger.info(f'Terminal manager initialized with default working directory: {workspace_path}')

# Store active sessions
active_sessions = {}


# ============================================================================
# REST API Endpoints - File Operations
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'message': 'Backend is running',
        'workspace': file_manager.workspace_root
    })


@app.route('/api/workspace', methods=['GET', 'POST'])
def workspace():
    """Get or set workspace directory"""
    if request.method == 'GET':
        return jsonify(file_manager.get_workspace())
    else:
        data = request.json
        workspace_path = data.get('workspace_path')
        if not workspace_path:
            return jsonify({'error': 'workspace_path required'}), 400
        result = file_manager.set_workspace(workspace_path)
        return jsonify(result)


@app.route('/api/files/tree', methods=['GET'])
def get_file_tree():
    """Get file tree structure"""
    path = request.args.get('path', '')
    max_depth = int(request.args.get('max_depth', 10))
    tree = file_manager.get_file_tree(path, max_depth)
    return jsonify(tree)


@app.route('/api/files/list', methods=['GET'])
def list_files():
    """List files in a directory"""
    path = request.args.get('path', '')
    result = file_manager.list_files(path)
    return jsonify(result)


@app.route('/api/files/read', methods=['POST'])
def read_file():
    """Read file content"""
    data = request.json
    file_path = data.get('path')
    if not file_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.read_file(file_path)
    return jsonify(result)


@app.route('/api/files/write', methods=['POST'])
def write_file():
    """Write file content"""
    data = request.json
    file_path = data.get('path')
    content = data.get('content', '')
    if not file_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.write_file(file_path, content)
    return jsonify(result)


@app.route('/api/files/create', methods=['POST'])
def create_file():
    """Create a new file"""
    data = request.json
    file_path = data.get('path')
    content = data.get('content', '')
    if not file_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.create_file(file_path, content)
    return jsonify(result)


@app.route('/api/files/create-folder', methods=['POST'])
def create_folder():
    """Create a new folder"""
    data = request.json
    folder_path = data.get('path')
    if not folder_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.create_folder(folder_path)
    return jsonify(result)


@app.route('/api/files/delete', methods=['POST', 'DELETE'])
def delete_file():
    """Delete a file"""
    # Support both POST (with JSON body) and DELETE (with JSON body)
    if request.method == 'DELETE':
        data = request.json if request.is_json else {}
    else:
    data = request.json
    
    file_path = data.get('path')
    if not file_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.delete_file(file_path)
    return jsonify(result)


@app.route('/api/files/delete-folder', methods=['POST'])
def delete_folder():
    """Delete a folder"""
    data = request.json
    folder_path = data.get('path')
    if not folder_path:
        return jsonify({'error': 'path required'}), 400
    result = file_manager.delete_folder(folder_path)
    return jsonify(result)


@app.route('/api/files/rename', methods=['POST'])
def rename_file():
    """Rename a file or folder"""
    data = request.json
    old_path = data.get('old_path')
    new_name = data.get('new_name')
    if not old_path or not new_name:
        return jsonify({'error': 'old_path and new_name required'}), 400
    result = file_manager.rename(old_path, new_name)
    return jsonify(result)


# ============================================================================
# WebSocket Events - Terminal Operations
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f'Client connected: {request.sid}')
    emit('connection_response', {'status': 'connected', 'sid': request.sid})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f'Client disconnected: {request.sid}')
    # Clean up sessions for this client
    sessions_to_remove = [sid for sid, data in active_sessions.items() if data.get('client_sid') == request.sid]
    for session_id in sessions_to_remove:
        terminal_manager.close_session(session_id)
        active_sessions.pop(session_id, None)


@socketio.on('create_terminal')
def handle_create_terminal(data):
    """Create a new terminal session"""
    try:
        # Use workspace root (outputs directory) as default working directory
        # If working_dir is explicitly provided and valid, use it
        requested_working_dir = data.get('working_dir')
        if requested_working_dir and requested_working_dir.strip() and requested_working_dir.strip() != '/' and os.path.exists(requested_working_dir):
            working_dir = requested_working_dir
        else:
            # Default to the workspace root (outputs directory)
            working_dir = file_manager.workspace_root
            logger.info(f'Using workspace root as terminal working directory: {working_dir}')
        
        session_id = data.get('session_id')
        client_sid = request.sid  # Get the client's socket ID

        logger.info(f'Creating terminal session: {session_id} for client {client_sid} in {working_dir}')

        # Join the client to a room named by their socket ID
        # This allows background threads to emit to this specific client
        join_room(client_sid)
        logger.info(f'Client {client_sid} joined room {client_sid}')

        session_id = terminal_manager.create_session(session_id, working_dir, client_sid)

        if session_id:
            active_sessions[session_id] = {
                'client_sid': client_sid,
                'working_dir': working_dir
            }
            emit('terminal_created', {
                'session_id': session_id,
                'status': 'success'
            })
            logger.info(f'Terminal session created: {session_id} for client {client_sid}')
        else:
            emit('terminal_error', {
                'error': 'Failed to create terminal session'
            })
            logger.error('Failed to create terminal session')

    except Exception as e:
        logger.error(f'Error creating terminal: {e}')
        emit('terminal_error', {'error': str(e)})


@socketio.on('terminal_input')
def handle_terminal_input(data):
    """Handle input to terminal"""
    try:
        session_id = data.get('session_id')
        input_data = data.get('data', '')

        logger.info(f'Received terminal input for session {session_id}: {repr(input_data)}')

        if not session_id:
            emit('terminal_error', {'error': 'session_id required'})
            return

        success = terminal_manager.send_input(session_id, input_data)

        if not success:
            logger.error(f'Failed to send input to session {session_id}')
            emit('terminal_error', {
                'error': 'Invalid session or session not found',
                'session_id': session_id
            })
        else:
            logger.info(f'Successfully sent input to session {session_id}')

    except Exception as e:
        logger.error(f'Error handling terminal input: {e}')
        emit('terminal_error', {'error': str(e)})


@socketio.on('terminal_resize')
def handle_terminal_resize(data):
    """Handle terminal resize"""
    try:
        session_id = data.get('session_id')
        cols = data.get('cols', 80)
        rows = data.get('rows', 24)

        if not session_id:
            emit('terminal_error', {'error': 'session_id required'})
            return

        success = terminal_manager.resize_session(session_id, cols, rows)

        if success:
            emit('terminal_resized', {
                'session_id': session_id,
                'cols': cols,
                'rows': rows
            })

    except Exception as e:
        logger.error(f'Error resizing terminal: {e}')
        emit('terminal_error', {'error': str(e)})


@socketio.on('close_terminal')
def handle_close_terminal(data):
    """Close a terminal session"""
    try:
        session_id = data.get('session_id')

        if not session_id:
            emit('terminal_error', {'error': 'session_id required'})
            return

        success = terminal_manager.close_session(session_id)
        active_sessions.pop(session_id, None)

        if success:
            emit('terminal_closed', {'session_id': session_id})
            logger.info(f'Terminal session closed: {session_id}')

    except Exception as e:
        logger.error(f'Error closing terminal: {e}')
        emit('terminal_error', {'error': str(e)})


# ============================================================================
# Serve Frontend (for production)
# ============================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve frontend files"""
    frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'dist')
    if path and os.path.exists(os.path.join(frontend_dist, path)):
        return send_from_directory(frontend_dist, path)
    return send_from_directory(frontend_dist, 'index.html')


# ============================================================================
# Main
# ============================================================================

if __name__ == '__main__':
    import socket
    
    # Get network IP addresses
    def get_network_ips():
        """Get all non-loopback IPv4 addresses"""
        ips = []
        try:
            hostname = socket.gethostname()
            for addr in socket.gethostbyname_ex(hostname)[2]:
                if not addr.startswith('127.'):
                    ips.append(addr)
        except Exception:
            pass
        return ips
    
    logger.info('=' * 60)
    logger.info('Starting IDE Backend Server...')
    logger.info(f'Workspace: {file_manager.workspace_root}')
    logger.info(f'Host: 0.0.0.0 (accessible from network)')
    logger.info(f'Port: 5002 (Agent backend runs on 5001)')
    
    # Try to show network IPs
    try:
        network_ips = get_network_ips()
        if network_ips:
            logger.info(f'\n✅ IDE Backend accessible at:')
            logger.info(f'   Local:   http://localhost:5002')
            for ip in network_ips:
                logger.info(f'   Network: http://{ip}:5002')
            logger.info(f'\n   Use the Network URL from other devices on your local network.')
            logger.info(f'   Make sure port 5002 is open in your firewall.')
            logger.info(f'\n   Note: Agent backend runs on port 5001')
        else:
            logger.info(f'\n✅ IDE Backend accessible at:')
            logger.info(f'   Local:   http://localhost:5002')
            logger.info(f'   (No network IPs detected automatically)')
            logger.info(f'   Find your network IP with: ifconfig (Mac/Linux) or ipconfig (Windows)')
            logger.info(f'   Note: Agent backend runs on port 5001')
    except Exception as e:
        logger.info(f'\n✅ IDE Backend accessible at:')
        logger.info(f'   Local:   http://localhost:5002')
        logger.warning(f'   Could not detect network IPs: {e}')
        logger.info(f'   Note: Agent backend runs on port 5001')
    
    logger.info('=' * 60)

    # Run with SocketIO
    # IDE backend runs on port 5002 to avoid conflict with agent backend on 5001
    socketio.run(
        app,
        host='0.0.0.0',  # Bind to all interfaces (accessible from network)
        port=5002,  # Changed from 5001 to 5002 to avoid conflict with agent backend
        debug=True,
        allow_unsafe_werkzeug=True
    )
