# Gemini-Vibe Backend

Python backend for the Gemini-Vibe IDE with full terminal support.

## Features

- **Real Terminal Execution**: PTY (pseudo-terminal) support for running actual shell commands
- **WebSocket Communication**: Real-time terminal I/O via Socket.IO
- **File System API**: Complete file operations (read, write, create, delete, rename)
- **Multi-Session Support**: Handle multiple terminal sessions simultaneously
- **Workspace Management**: Set and manage workspace directories

## Architecture

### Components

1. **app.py** - Main Flask application with REST API and WebSocket handlers
2. **terminal_manager.py** - Manages PTY terminal sessions
3. **file_manager.py** - Handles file system operations

### Terminal Features

- Full PTY support for running any command (npm, python, bash, etc.)
- Real-time output streaming via WebSocket
- Support for keyboard shortcuts (Ctrl+C, Ctrl+D, Tab)
- Terminal resize support
- Multiple concurrent terminal sessions

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Backend

### Development Mode

```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Production Mode

For production, use a production WSGI server like gunicorn:

```bash
pip install gunicorn eventlet
gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:5000 app:app
```

## API Documentation

### REST Endpoints

#### Health Check
- **GET** `/api/health`
- Returns backend status

#### Workspace Management
- **GET** `/api/workspace` - Get current workspace
- **POST** `/api/workspace` - Set workspace directory
  ```json
  {
    "workspace_path": "/path/to/workspace"
  }
  ```

#### File Operations

- **GET** `/api/files/tree?path=&max_depth=10` - Get file tree
- **GET** `/api/files/list?path=` - List files in directory
- **POST** `/api/files/read` - Read file content
  ```json
  {
    "path": "relative/path/to/file"
  }
  ```
- **POST** `/api/files/write` - Write file content
  ```json
  {
    "path": "relative/path/to/file",
    "content": "file content"
  }
  ```
- **POST** `/api/files/create` - Create new file
- **POST** `/api/files/create-folder` - Create new folder
- **POST** `/api/files/delete` - Delete file
- **POST** `/api/files/delete-folder` - Delete folder
- **POST** `/api/files/rename` - Rename file/folder
  ```json
  {
    "old_path": "old/path",
    "new_name": "newname"
  }
  ```

### WebSocket Events

#### Client → Server

- **`create_terminal`** - Create new terminal session
  ```json
  {
    "session_id": "term_123",
    "working_dir": "/path/to/dir"
  }
  ```

- **`terminal_input`** - Send input to terminal
  ```json
  {
    "session_id": "term_123",
    "data": "ls -la\n"
  }
  ```

- **`terminal_resize`** - Resize terminal
  ```json
  {
    "session_id": "term_123",
    "cols": 80,
    "rows": 24
  }
  ```

- **`close_terminal`** - Close terminal session
  ```json
  {
    "session_id": "term_123"
  }
  ```

#### Server → Client

- **`terminal_created`** - Terminal session created
- **`terminal_output`** - Terminal output data
- **`terminal_error`** - Terminal error
- **`terminal_closed`** - Terminal session closed

## Security

### Workspace Isolation

The file manager enforces workspace isolation - all file operations are restricted to the configured workspace directory. Attempts to access files outside the workspace will be rejected.

### Path Validation

All file paths are validated and normalized to prevent directory traversal attacks.

## Configuration

### Environment Variables

- `SECRET_KEY` - Flask secret key (set in production)
- `WORKSPACE_ROOT` - Default workspace directory (defaults to user home)

### Default Settings

- **Port**: 5000
- **Host**: 0.0.0.0 (all interfaces)
- **Default Workspace**: User's home directory

## Troubleshooting

### Terminal not working

1. Ensure `/bin/bash` is available on your system
2. Check terminal session logs in backend console
3. Verify WebSocket connection is established

### File operations failing

1. Check workspace permissions
2. Verify workspace path is set correctly
3. Check backend logs for detailed error messages

### Connection issues

1. Ensure backend is running on port 5000
2. Check CORS settings if accessing from different origin
3. Verify firewall settings allow connections on port 5000

## Development

### Adding New Features

1. **New REST Endpoint**: Add route in `app.py`
2. **New File Operation**: Add method in `file_manager.py`
3. **Terminal Features**: Modify `terminal_manager.py`

### Testing

Test the API endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:5000/api/health

# Get workspace
curl http://localhost:5000/api/workspace

# Get file tree
curl http://localhost:5000/api/files/tree
```

## License

MIT
