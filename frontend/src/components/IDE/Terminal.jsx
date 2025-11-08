import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { io } from 'socket.io-client'
import './Terminal.css'

// Dynamically determine backend URL based on current hostname
// IDE backend runs on port 5002 (agent backend runs on 5001)
const getBackendUrl = () => {
  const hostname = window.location.hostname;
  const ideBackendPort = 5002;  // IDE backend port (different from agent backend)
  
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${ideBackendPort}`;
  }
  
  return `http://${hostname}:${ideBackendPort}`;
};

const BACKEND_URL = getBackendUrl();
console.log(`🔌 Terminal Backend URL: ${BACKEND_URL}`);

const Terminal = forwardRef(({ workingDir }, ref) => {
  const [terminalOutput, setTerminalOutput] = useState('')
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const terminalRef = useRef(null)
  const socketRef = useRef(null)
  const inputRef = useRef(null)

  // Expose method to execute command programmatically
  useImperativeHandle(ref, () => ({
    executeCommand: (command) => {
      if (connected && sessionId && socketRef.current) {
        console.log('⌨️ Executing command:', command)
        socketRef.current.emit('terminal_input', {
          session_id: sessionId,
          data: command + '\n'
        })
      } else {
        console.warn('⚠️ Cannot execute command - terminal not ready')
      }
    }
  }))

  // Initialize socket connection and terminal session
  useEffect(() => {
    let currentSessionId = null

    try {
      // Connect to backend WebSocket
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000
      })
      socketRef.current = socket

      // Add wildcard event listener to catch ALL events
      socket.onAny((eventName, ...args) => {
        console.log('🟢 ANY EVENT RECEIVED:', eventName, args)
      })

      socket.on('connect', () => {
        console.log('✅ Connected to backend - Socket ID:', socket.id)
        console.log('✅ Socket instance:', socket)
        setConnected(true)

        // Create terminal session
        // If workingDir is null/undefined/empty, backend will use workspace root (outputs directory)
        currentSessionId = `term_${Date.now()}`
        console.log('✅ Creating terminal session:', currentSessionId)
        console.log('✅ Working directory requested:', workingDir || 'default (workspace root)')
        socket.emit('create_terminal', {
          session_id: currentSessionId,
          working_dir: workingDir || null // null will trigger backend to use workspace root
        })
        setSessionId(currentSessionId)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from backend')
        setConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.warn('Backend connection failed:', error.message)
        setConnected(false)
        setTerminalOutput('Backend terminal not available. Start the backend server to use the terminal.\r\n')
      })

      socket.on('terminal_created', (data) => {
        console.log('✅ Terminal session created:', data.session_id)
        // Terminal should now be in the outputs directory
        // Show a welcome message with the current directory
        setTerminalOutput(prev => prev + 'Terminal ready. You are in the workspace directory.\r\n')
      })

      socket.on('terminal_output', (data) => {
        // Backend sends: { session_id, data: output_string }
        console.log('📥 Terminal output received:', data)
        if (data && data.data) {
          const output = data.data
          console.log('📥 Output content:', output)
        setTerminalOutput(prev => {
            const newOutput = prev + output
            console.log('📥 Updated terminal output, length:', newOutput.length)
          return newOutput
        })
        } else if (data && data.output) {
          // Fallback if backend sends 'output' instead of 'data'
          setTerminalOutput(prev => prev + data.output)
        }
      })

      console.log('📡 Registered terminal_output event listener on socket:', socket.id)

      socket.on('terminal_error', (data) => {
        console.error('Terminal error:', data.error)
        setTerminalOutput(prev => prev + `\r\nError: ${data.error}\r\n`)
      })

      socket.on('connection_response', (data) => {
        console.log('Connection response:', data)
      })

      // Cleanup on unmount
      return () => {
        try {
          if (currentSessionId && socket) {
            socket.emit('close_terminal', { session_id: currentSessionId })
          }
          socket.disconnect()
        } catch (error) {
          console.error('Error during cleanup:', error)
        }
      }
    } catch (error) {
      console.error('Failed to initialize terminal:', error)
      setTerminalOutput('Failed to initialize terminal. Check console for details.\r\n')
    }
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // Handle terminal input
  const handleKeyDown = (e) => {
    if (!connected || !sessionId || !socketRef.current) {
      console.log('⚠️ Cannot send input - connected:', connected, 'sessionId:', sessionId, 'socket:', socketRef.current)
      return
    }

    // Send input to backend
    if (e.key === 'Enter') {
      const input = e.target.value
      console.log('⌨️ Sending terminal input:', input, 'to session:', sessionId)
      console.log('⌨️ Socket instance when sending:', socketRef.current)
      socketRef.current.emit('terminal_input', {
        session_id: sessionId,
        data: input + '\n'
      })
      e.target.value = ''
      e.preventDefault()
    } else if (e.key === 'Tab') {
      // Send tab for autocomplete
      socketRef.current.emit('terminal_input', {
        session_id: sessionId,
        data: '\t'
      })
      e.preventDefault()
    } else if (e.ctrlKey && e.key === 'c') {
      // Send Ctrl+C
      socketRef.current.emit('terminal_input', {
        session_id: sessionId,
        data: '\x03'
      })
      e.preventDefault()
    } else if (e.ctrlKey && e.key === 'd') {
      // Send Ctrl+D
      socketRef.current.emit('terminal_input', {
        session_id: sessionId,
        data: '\x04'
      })
      e.preventDefault()
    }
  }

  const clearTerminal = () => {
    setTerminalOutput('')
  }

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          Terminal {connected ? <span style={{ color: '#34A853' }}>●</span> : <span style={{ color: '#EA4335' }}>○</span>}
        </div>
        <button className="terminal-clear-button" onClick={clearTerminal} title="Clear terminal">
          Clear
        </button>
      </div>

        <div className="terminal-interactive">
        <div className="terminal-output" ref={terminalRef}>
          <pre style={{ 
            margin: 0, 
            padding: '10px', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.4',
            color: '#CCCCCC',
            backgroundColor: '#1E1E1E'
          }}>
            {terminalOutput || (connected ? '' : 'Connecting to terminal backend...\r\n')}
          </pre>
        </div>
          <div className="terminal-input-container">
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
            placeholder={connected && sessionId ? "Type command and press Enter..." : "Connecting to terminal..."}
              onKeyDown={handleKeyDown}
            disabled={!connected || !sessionId}
              autoFocus
            />
          </div>
        </div>
    </div>
  )
})

Terminal.displayName = 'Terminal'

export default Terminal

