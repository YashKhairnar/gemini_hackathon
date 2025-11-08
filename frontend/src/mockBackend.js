// Mock backend for DemoIDE
// This provides a simple in-memory file system for demonstration

// Agent outputs placeholder - will be loaded from actual files
const OUTPUTS_PLACEHOLDER = {
  'backend_output.md': '# Backend Output\n\nFastAPI backend implementation for todo app with authentication.\n\n[Full content available in agentapp/src/agentapp/outputs/backend_output.md]',
  'frontend_output.md': '# Frontend Output\n\nReact frontend implementation for todo app.\n\n[Full content available in agentapp/src/agentapp/outputs/frontend_output.md]',
  'decomposition_output.md': '# Decomposition Output\n\nTask decomposition and requirements breakdown.\n\n[Full content available in agentapp/src/agentapp/outputs/decomposition_output.md]',
  'qa_validation_output.md': '# QA Validation Output\n\nQA validation report and test results.\n\n[Full content available in agentapp/src/agentapp/outputs/qa_validation_output.md]'
};

let mockFileSystem = {
  'outputs': {
    type: 'folder',
    children: {
      'backend_output.md': {
        type: 'file',
        content: OUTPUTS_PLACEHOLDER['backend_output.md'],
        _isAgentOutput: true,
        _path: 'agentapp/src/agentapp/outputs/backend_output.md'
      },
      'frontend_output.md': {
        type: 'file',
        content: OUTPUTS_PLACEHOLDER['frontend_output.md'],
        _isAgentOutput: true,
        _path: 'agentapp/src/agentapp/outputs/frontend_output.md'
      },
      'decomposition_output.md': {
        type: 'file',
        content: OUTPUTS_PLACEHOLDER['decomposition_output.md'],
        _isAgentOutput: true,
        _path: 'agentapp/src/agentapp/outputs/decomposition_output.md'
      },
      'qa_validation_output.md': {
        type: 'file',
        content: OUTPUTS_PLACEHOLDER['qa_validation_output.md'],
        _isAgentOutput: true,
        _path: 'agentapp/src/agentapp/outputs/qa_validation_output.md'
      }
    }
  },
  'src': {
    type: 'folder',
    children: {
      'App.js': {
        type: 'file',
        content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;'
      },
      'index.js': {
        type: 'file',
        content: 'import React from "react";\nimport ReactDOM from "react-dom";\nimport App from "./App";\n\nReactDOM.render(<App />, document.getElementById("root"));'
      }
    }
  },
  'package.json': {
    type: 'file',
    content: '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'
  },
  'README.md': {
    type: 'file',
    content: '# Agent Outputs IDE\n\nThis IDE displays the outputs from the multi-agent AI system.\n\n## Outputs Folder\n\nThe `outputs/` folder contains:\n- `backend_output.md` - FastAPI backend implementation\n- `frontend_output.md` - React frontend implementation\n- `decomposition_output.md` - Task decomposition\n- `qa_validation_output.md` - QA validation report'
  }
};

export const IS_DEMO_MODE = true;

// Helper function to get file at path
function getFileAtPath(path) {
  const parts = path.split('/').filter(p => p);
  let current = mockFileSystem;
  
  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return current;
}

// Helper function to set file at path
function setFileAtPath(path, file) {
  const parts = path.split('/').filter(p => p);
  const fileName = parts.pop();
  let current = mockFileSystem;
  
  for (const part of parts) {
    if (!current[part] || current[part].type !== 'folder') {
      current[part] = { type: 'folder', children: {} };
    }
    current = current[part].children || current[part];
  }
  
  current[fileName] = file;
}

export async function getFileTree() {
  return {
    success: true,
    data: mockFileSystem
  };
}

export async function readFile(filePath) {
  const file = getFileAtPath(filePath);
  
  if (!file || file.type !== 'file') {
    return {
      success: false,
      error: 'File not found'
    };
  }
  
  return {
    success: true,
    content: file.content || ''
  };
}

export async function writeFile(filePath, content) {
  const file = getFileAtPath(filePath);
  
  if (!file) {
    // Create new file
    setFileAtPath(filePath, {
      type: 'file',
      content: content
    });
  } else if (file.type === 'file') {
    file.content = content;
  } else {
    return {
      success: false,
      error: 'Path is not a file'
    };
  }
  
  return {
    success: true
  };
}

export async function createFile(filePath, content = '') {
  const file = getFileAtPath(filePath);
  
  if (file) {
    return {
      success: false,
      error: 'File already exists'
    };
  }
  
  setFileAtPath(filePath, {
    type: 'file',
    content: content
  });
  
  return {
    success: true
  };
}

export async function createFolder(folderPath) {
  const folder = getFileAtPath(folderPath);
  
  if (folder) {
    return {
      success: false,
      error: 'Folder already exists'
    };
  }
  
  setFileAtPath(folderPath, {
    type: 'folder',
    children: {}
  });
  
  return {
    success: true
  };
}

export async function deleteFile(filePath) {
  const parts = filePath.split('/').filter(p => p);
  const fileName = parts.pop();
  let current = mockFileSystem;
  
  for (const part of parts) {
    if (current[part]) {
      current = current[part].children || current[part];
    } else {
      return {
        success: false,
        error: 'File not found'
      };
    }
  }
  
  if (current[fileName]) {
    delete current[fileName];
    return {
      success: true
    };
  }
  
  return {
    success: false,
    error: 'File not found'
  };
}

export async function renameFile(oldPath, newPath) {
  const file = getFileAtPath(oldPath);
  
  if (!file) {
    return {
      success: false,
      error: 'File not found'
    };
  }
  
  // Delete old file
  await deleteFile(oldPath);
  
  // Create new file
  setFileAtPath(newPath, file);
  
  return {
    success: true
  };
}

export async function executeCommand(command) {
  // Mock command execution
  return {
    success: true,
    output: `$ ${command}\nMock output: Command executed successfully`,
    error: null
  };
}

