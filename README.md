# LiveAgent

A powerful multi-agent AI system that transforms your ideas into fully functional applications in minutes. LiveAgent uses CrewAI to orchestrate multiple specialized AI agents that collaboratively generate, test, and validate code for both frontend and backend components.

## 🎯 Overview

LiveAgent is a complete development platform that combines:

- **Multi-Agent Code Generation**: AI agents that collaborate to generate production-ready code
- **Integrated IDE**: Built-in code editor with file management and terminal support
- **Real-time Collaboration**: Automerge-powered sync for collaborative editing
- **Full-Stack Support**: Generates both frontend (React/TypeScript) and backend code
- **Progress Tracking**: Real-time monitoring of code generation progress

## 🏗️ Architecture

The project consists of three main components:

### 1. **Frontend** (`/frontend`)
- React + TypeScript application
- Automerge for local-first, collaborative document synchronization
- Beautiful UI for submitting ideas and viewing generated code
- Integrated IDE with file tree, code editor, and terminal
- WebSocket sync server for real-time collaboration

### 2. **Agent Backend** (`/agentapp`)
- CrewAI-based multi-agent system
- Flask API server (port 5001)
- Specialized AI agents:
  - **Orchestrator Agent**: Analyzes requirements and decomposes tasks
  - **Frontend Agent**: Generates React/TypeScript frontend code
  - **Backend Agent**: Generates backend/server code
  - **QA Agent**: Validates and tests generated code
- Generates code into `outputs/` directory

### 3. **IDE Backend** (`/ide_backend`)
- Flask API server (port 5002)
- File system operations (read, write, create, delete, rename)
- Terminal management with PTY support
- WebSocket communication for real-time terminal I/O
- Workspace management focused on generated code

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Python** 3.10 - 3.13
- **UV** (Python package manager): `pip install uv`
- **OpenAI API Key** (for CrewAI agents)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd liveAgent
   ```

2. **Set up the Agent Backend**
   ```bash
   cd agentapp
   crewai install
   ```
   
   Create a `.env` file in the `agentapp` directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Set up the IDE Backend**
   ```bash
   cd ide_backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Set up the Frontend**
   ```bash
   cd frontend
   npm install  # or pnpm install
   ```

### Running the Application

You need to run three services simultaneously:

1. **Start the Agent Backend** (Port 5001)
   ```bash
   cd agentapp
   python src/agentapp/main.py
   ```

2. **Start the IDE Backend** (Port 5002)
   ```bash
   cd ide_backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python app.py
   ```

3. **Start the Frontend** (Port 5173) and Sync Server (Port 3030)
   ```bash
   cd frontend
   npm run dev:full  # This starts both Vite dev server and sync server
   ```

   Or run them separately:
   ```bash
   # Terminal 1: Sync Server
   npm run sync-server
   
   # Terminal 2: Frontend
   npm run dev
   ```

4. **Access the Application**
   - Open your browser to `http://localhost:5173`
   - Enter your idea and click "Launch"
   - Watch as AI agents generate your application
   - View and edit the generated code in the IDE

## 📖 Usage

### 1. Submit an Idea

On the home page, enter a description of what you want to build. For example:
- "Build a todo app with user authentication"
- "Create a data visualization dashboard"
- "Build a REST API for a blog system"

### 2. Monitor Progress

After launching, you'll be taken to the IDE where you can:
- View real-time progress of code generation
- See which files are being created
- Monitor agent activity

### 3. View and Edit Generated Code

Once generation is complete:
- Browse the file tree to see all generated files
- Open files in the code editor
- Edit code directly in the IDE
- Use the integrated terminal to run commands
- Install dependencies, run tests, start servers

### 4. Collaborate

The application uses Automerge for real-time collaboration:
- Open the same document URL in multiple browser tabs
- Changes sync automatically across all clients
- Works over local network for team collaboration

## 🔧 Configuration

### Agent Configuration

Modify agent behavior in `agentapp/src/agentapp/config/`:
- `agents.yaml`: Define agent roles, goals, and backstories
- `tasks.yaml`: Configure task descriptions and requirements

### Environment Variables

**Agent Backend** (`.env` in `agentapp/`):
```env
OPENAI_API_KEY=your_api_key_here
```

### Port Configuration

Default ports:
- **Frontend**: 5173 (Vite dev server)
- **Sync Server**: 3030 (Automerge sync)
- **Agent Backend**: 5001 (Flask API)
- **IDE Backend**: 5002 (Flask API + WebSocket)

To change ports, modify the respective configuration files.

## 📁 Project Structure

```
liveAgent/
├── agentapp/              # Multi-agent code generation system
│   ├── src/agentapp/
│   │   ├── config/        # Agent and task configurations
│   │   ├── tools/         # Custom tools for agents
│   │   ├── outputs/       # Generated code output directory
│   │   ├── crew.py        # CrewAI crew definition
│   │   └── main.py        # Flask API server
│   └── pyproject.toml     # Python dependencies
│
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── IDE/       # IDE components (editor, terminal, file tree)
│   │   │   └── App.tsx    # Main app component
│   │   ├── pages/         # Page components
│   │   └── main.tsx       # Application entry point
│   ├── sync-server.js     # Automerge sync server
│   └── package.json       # Node.js dependencies
│
└── ide_backend/           # IDE backend server
    ├── app.py             # Flask API + WebSocket server
    ├── file_manager.py    # File operations
    ├── terminal_manager.py # Terminal management
    └── requirements.txt   # Python dependencies
```

## 🔌 API Endpoints

### Agent Backend (Port 5001)

- `POST /launch` - Start code generation
  ```json
  {
    "user_input": "Build a todo app with authentication"
  }
  ```

- `GET /status` - Get generation status and progress
  ```json
  {
    "is_generating": true,
    "is_complete": false,
    "progress": {
      "step": "Generating",
      "message": "AI agents are generating code files...",
      "percentage": 45
    },
    "has_frontend": true,
    "has_backend": true
  }
  ```

### IDE Backend (Port 5002)

- `GET /api/health` - Health check
- `GET /api/workspace` - Get workspace directory
- `POST /api/workspace` - Set workspace directory
- `GET /api/files/tree` - Get file tree structure
- `POST /api/files/read` - Read file content
- `POST /api/files/write` - Write file content
- `POST /api/files/create` - Create new file
- `POST /api/files/delete` - Delete file
- `POST /api/files/clear-workspace` - Clear workspace
- WebSocket events for terminal operations

See `ide_backend/README.md` for complete API documentation.

## 🧪 Development

### Running in Development Mode

All services support hot-reload in development:
- Frontend: Vite HMR enabled
- Agent Backend: Flask debug mode
- IDE Backend: Flask debug mode

### Adding New Features

1. **New Agent Capabilities**: Modify `agentapp/src/agentapp/config/agents.yaml`
2. **New Tasks**: Update `agentapp/src/agentapp/config/tasks.yaml`
3. **Custom Tools**: Add tools in `agentapp/src/agentapp/tools/`
4. **Frontend Features**: Add components in `frontend/src/components/`
5. **Backend Features**: Add endpoints in `ide_backend/app.py`

### Testing

```bash
# Test agent backend
cd agentapp
crewai test

# Test frontend
cd frontend
npm run lint
npm run build
```

## 🐛 Troubleshooting

### Agent Generation Not Starting

1. Check that the agent backend is running on port 5001
2. Verify `OPENAI_API_KEY` is set in `agentapp/.env`
3. Check browser console for API errors
4. Verify CORS is enabled on the backend

### Files Not Appearing in IDE

1. Check that IDE backend is running on port 5002
2. Verify workspace is set to `agentapp/src/agentapp/outputs/`
3. Check IDE backend logs for file operation errors
4. Ensure outputs directory exists and has proper permissions

### Terminal Not Working

1. Verify WebSocket connection is established
2. Check that `/bin/bash` is available on your system
3. Review terminal manager logs in IDE backend
4. Ensure workspace directory has proper permissions

### Sync Server Issues

1. Check that sync server is running on port 3030
2. Verify WebSocket connection in browser console
3. Check firewall settings for port 3030
4. Review sync server logs

## 🔒 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Workspace Isolation**: File operations are restricted to the workspace directory
- **Path Validation**: All file paths are validated to prevent directory traversal
- **CORS**: Configure CORS properly for production deployments
- **Network Access**: The application binds to `0.0.0.0` by default for network access

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Additional Resources

- [CrewAI Documentation](https://docs.crewai.com)
- [Automerge Documentation](https://automerge.org)
- [React Documentation](https://react.dev)
- [Flask Documentation](https://flask.palletsprojects.com)

## 🆘 Support

For issues, questions, or feedback:
- Check the individual component READMEs:
  - `agentapp/README.md` - Agent system documentation
  - `frontend/README.md` - Frontend documentation
  - `ide_backend/README.md` - IDE backend documentation
- Open an issue on GitHub
- Review the troubleshooting section above

---

**Built with ❤️ using CrewAI, React, Flask, and Automerge**

