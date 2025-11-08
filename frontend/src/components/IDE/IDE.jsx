import { useState, useEffect, useRef } from 'react'
import { useDocument } from '@automerge/react'
import FileExplorer from './FileExplorer'
import CodeEditor from './CodeEditor'
import Terminal from './Terminal'
import AgentsPanel from './AgentsPanel'
import './IDE.css'
// Note: FileDocument and RootDocument are TypeScript types, not needed in JSX

// Dynamically determine backend URL based on current hostname
// This allows the app to work from different devices on the same network
// IDE backend runs on port 5002 (agent backend runs on 5001)
const getBackendUrl = () => {
  const hostname = window.location.hostname;
  const ideBackendPort = 5002;  // IDE backend port (different from agent backend)
  
  // If accessing via localhost, use localhost for backend
  // Otherwise, use the same hostname (which will be the server's IP on the network)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${ideBackendPort}`;
  }
  
  // Use the same hostname as the current page
  return `http://${hostname}:${ideBackendPort}`;
};

const BACKEND_URL = getBackendUrl();
console.log(`🔌 IDE Backend URL: ${BACKEND_URL}`);

function IDE({ repo, rootHandle }) {
  const [files, setFiles] = useState({})
  const [openFiles, setOpenFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileDocHandles, setFileDocHandles] = useState({}) // Map filePath -> Automerge doc handle
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState(null)
  const terminalRef = useRef(null)
  
  // Get agent backend URL (different from IDE backend)
  const getAgentBackendUrl = () => {
    const hostname = window.location.hostname;
    const agentBackendPort = 5001; // Agent backend runs on 5001
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://localhost:${agentBackendPort}`;
    }
    return `http://${hostname}:${agentBackendPort}`;
  };
  
  const AGENT_BACKEND_URL = getAgentBackendUrl();
  
  // Subscribe to root document to get file mappings
  const rootDoc = rootHandle ? useDocument(rootHandle.url, { suspense: false }) : null
  
  console.log('🔵 Automerge IDE - Root doc:', rootDoc)
  console.log('🔵 Automerge IDE - Repo:', repo)
  console.log('🔵 Automerge IDE - Root handle:', rootHandle)
  console.log('🔵 Automerge IDE - Files map:', rootDoc?.files)

  // Subscribe to file documents for real-time collaboration
  useEffect(() => {
    if (!rootDoc?.files || !repo) return
    
    // Load handles for all files in the root document
    const loadFileHandles = async () => {
      const handles = {}
      for (const [filePath, docUrl] of Object.entries(rootDoc.files)) {
        try {
          const handle = await repo.find(docUrl)
          await handle.whenReady()
          handles[filePath] = handle
          
          // Subscribe to changes in this file document
          handle.on('change', () => {
            const fileDoc = handle.docSync()
            if (fileDoc) {
              // Update open files if this file is open
              setOpenFiles(prev => prev.map(file => 
                file.path === filePath 
                  ? { ...file, content: fileDoc.content, handle }
                  : file
              ))
              
              // Update selected file if it's the current file
              setSelectedFile(prev => 
                prev?.path === filePath 
                  ? { ...prev, content: fileDoc.content, handle }
                  : prev
              )
              
              console.log('🔄 File updated via Automerge:', filePath)
            }
          })
        } catch (error) {
          console.error(`Error loading file handle for ${filePath}:`, error)
        }
      }
      setFileDocHandles(handles)
    }
    
    loadFileHandles()
  }, [rootDoc?.files, repo])

  // Load file tree from backend
  const loadFileTree = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/tree`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      } else {
        console.error('Failed to load file tree')
        // Fallback to empty structure
        setFiles({})
      }
    } catch (error) {
      console.error('Error loading file tree:', error)
      // Fallback to empty structure
      setFiles({})
    }
  }

  // Check generation status and poll if generating
  const checkGenerationStatus = async () => {
    try {
      const response = await fetch(`${AGENT_BACKEND_URL}/status`)
      if (response.ok) {
        const status = await response.json()
        setGenerationStatus(status)
        
        // Show loading if:
        // 1. Currently generating, OR
        // 2. Not complete yet and no files exist
        const shouldShowLoading = status.is_generating || (
          !status.is_complete && 
          !status.has_frontend && 
          !status.has_backend &&
          status.started_at !== null
        )
        setIsGenerating(shouldShowLoading)
        
        // If generation is complete, reload file tree
        if (status.is_complete && !status.is_generating) {
          setTimeout(() => {
            loadFileTree()
          }, 500) // Small delay to ensure files are written
        }
      }
    } catch (error) {
      console.error('Error checking generation status:', error)
      // Don't show loading if we can't reach the status endpoint
      setIsGenerating(false)
    }
  }
  
  // Load file tree on mount
  useEffect(() => {
    loadFileTree()
    // Check generation status on mount
    checkGenerationStatus()
  }, [])
  
  // Poll generation status while generating
  useEffect(() => {
    if (!isGenerating) return
    
    // Poll every 2 seconds while generating
    const interval = setInterval(() => {
      checkGenerationStatus()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [isGenerating])

  const handleFileSelect = async (filePath) => {
    try {
      // Check if we already have an Automerge doc for this file
      let fileDocUrl = rootDoc?.files?.[filePath]
      let fileHandle = fileDocHandles[filePath]
      
      // If no Automerge doc exists, create one and load content from backend
      if (!fileDocUrl && repo && rootHandle) {
        // First, load content from backend
        const response = await fetch(`${BACKEND_URL}/api/files/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: filePath
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const backendContent = data.content || ''
          
          // Create new Automerge document for this file
          fileHandle = repo.create({
            path: filePath,
            content: backendContent,
            lastModified: Date.now()
          })
          
          // Store the doc URL in root document
          rootHandle.change((doc) => {
            if (!doc.files) {
              doc.files = {}
            }
            doc.files[filePath] = fileHandle.url
          })
          
          fileDocUrl = fileHandle.url
          setFileDocHandles(prev => ({ ...prev, [filePath]: fileHandle }))
          
          console.log('✅ Created Automerge doc for file:', filePath, fileDocUrl)
        } else {
          console.error('Failed to load file from backend')
          return
        }
      } else if (fileDocUrl && repo && !fileHandle) {
        // Automerge doc exists but we don't have the handle yet
        fileHandle = await repo.find(fileDocUrl)
        await fileHandle.whenReady()
        setFileDocHandles(prev => ({ ...prev, [filePath]: fileHandle }))
        console.log('✅ Loaded existing Automerge doc for file:', filePath)
      }
      
      // Get content from Automerge doc if available
      let fileContent = ''
      if (fileHandle) {
        const fileDoc = fileHandle.docSync()
        fileContent = fileDoc?.content || ''
      } else {
        // Fallback to backend if Automerge not available
        const response = await fetch(`${BACKEND_URL}/api/files/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: filePath
          })
        })
        if (response.ok) {
          const data = await response.json()
          fileContent = data.content || ''
        }
      }
      
      const fileObj = {
        path: filePath,
        content: fileContent,
        docUrl: fileDocUrl,
        handle: fileHandle
      }

      // Add to open files if not already open
      const isAlreadyOpen = openFiles.some(f => f.path === filePath)
      if (!isAlreadyOpen) {
        setOpenFiles([...openFiles, fileObj])
      } else {
        // Update content of already open file
        setOpenFiles(openFiles.map(f =>
          f.path === filePath ? fileObj : f
        ))
      }

      setSelectedFile(fileObj)
    } catch (error) {
      console.error(`Error reading file: ${error.message}`)
    }
  }

  const handleFileContentChange = async (filePath, newContent) => {
    // Update in openFiles immediately for responsive UI
    setOpenFiles(openFiles.map(file =>
      file.path === filePath ? { ...file, content: newContent } : file
    ))

    // Update selectedFile if it's the current file
    if (selectedFile?.path === filePath) {
      setSelectedFile({ ...selectedFile, content: newContent })
    }

    // Save to Automerge document (for collaboration)
    const fileHandle = fileDocHandles[filePath] || selectedFile?.handle
    if (fileHandle && repo) {
      try {
        fileHandle.change((doc) => {
          doc.content = newContent
          doc.lastModified = Date.now()
        })
        console.log('✅ Updated Automerge doc for file:', filePath)
      } catch (error) {
        console.error('Error updating Automerge doc:', error)
      }
    }

    // Also save to backend (for persistence and backup)
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath,
          content: newContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Error saving file to backend: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error saving file to backend: ${error.message}`)
    }
  }

  const handleCloseFile = (filePath) => {
    const newOpenFiles = openFiles.filter(f => f.path !== filePath)
    setOpenFiles(newOpenFiles)

    if (selectedFile?.path === filePath) {
      setSelectedFile(newOpenFiles.length > 0 ? newOpenFiles[0] : null)
    }
  }

  const handleCreateFile = async (fileName, parentPath = '') => {
    try {
      // Construct full path - if parentPath is provided, use it; otherwise create in root
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName
      
      const response = await fetch(`${BACKEND_URL}/api/files/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath,
          content: ''
        })
      })

      if (response.ok) {
        await loadFileTree()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Error creating file: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error creating file: ${error.message}`)
    }
  }

  const handleCreateFolder = async (folderName, parentPath = '') => {
    try {
      // Construct full path - if parentPath is provided, use it; otherwise create in root
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName
      
      const response = await fetch(`${BACKEND_URL}/api/files/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: folderPath
        })
      })

      if (response.ok) {
        await loadFileTree()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Error creating folder: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error creating folder: ${error.message}`)
    }
  }

  const handleDeleteFile = async (filePath) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath
        })
      })

      if (response.ok) {
        await loadFileTree()
        handleCloseFile(filePath)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Error deleting: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error deleting: ${error.message}`)
    }
  }

  const handleRenameFile = async (oldPath, newName) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_path: oldPath,
          new_name: newName
        })
      })

      if (response.ok) {
        await loadFileTree()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Error renaming: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error renaming: ${error.message}`)
    }
  }

  const handleRunCode = async () => {
    if (!selectedFile) {
      console.warn('⚠️ No file selected')
      return
    }

    if (terminalRef.current && terminalRef.current.executeCommand) {
      const fileName = selectedFile.path.split('/').pop()
      const extension = fileName.split('.').pop()?.toLowerCase() || ''
      // Use the file path as returned from the backend (relative to workspace root)
      const filePath = selectedFile.path
      let command = ''

      switch (extension) {
        case 'py':
          command = `python "${filePath}"`
          break
        case 'js':
          command = `node "${filePath}"`
          break
        case 'ts':
          command = `ts-node "${filePath}"`
          break
        case 'java':
          const javaClassName = fileName.replace('.java', '')
          command = `javac "${filePath}" && java "${javaClassName}"`
          break
        case 'cpp':
          const cppExecName = fileName.replace('.cpp', '')
          command = `g++ "${filePath}" -o "${cppExecName}" && ./"${cppExecName}"`
          break
        case 'c':
          const cExecName = fileName.replace('.c', '')
          command = `gcc "${filePath}" -o "${cExecName}" && ./"${cExecName}"`
          break
        case 'go':
          command = `go run "${filePath}"`
          break
        case 'rs':
          const rsExecName = fileName.replace('.rs', '')
          command = `rustc "${filePath}" && ./"${rsExecName}"`
          break
        case 'rb':
          command = `ruby "${filePath}"`
          break
        case 'php':
          command = `php "${filePath}"`
          break
        case 'sh':
          command = `bash "${filePath}"`
          break
        default:
          console.warn(`⚠️ Unknown file type: .${extension}`)
          return
      }

      if (terminalRef.current && terminalRef.current.executeCommand) {
        terminalRef.current.executeCommand(command)
      }
    }
  }

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!generationStatus?.started_at) return null
    const started = new Date(generationStatus.started_at)
    const now = new Date()
    const elapsed = Math.floor((now - started) / 1000) // seconds
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="ide-container">
      <div className="ide-header">
        <div className="ide-title">Live Agent IDE</div>
        <button className="run-code-button" onClick={handleRunCode}>
          ▷ Run Code
        </button>
      </div>

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="ide-loading-overlay">
          <div className="ide-loading-content">
            <div className="ide-loading-spinner"></div>
            <h2 className="ide-loading-title">AI Agents are generating your code...</h2>
            <p className="ide-loading-message">
              {generationStatus?.error 
                ? `Error: ${generationStatus.error}`
                : 'Please wait while our AI agents create your frontend and backend code.'}
            </p>
            {generationStatus?.started_at && !generationStatus?.error && (
              <p className="ide-loading-time">Elapsed time: {getElapsedTime()}</p>
            )}
            <div className="ide-loading-status">
              {generationStatus?.has_frontend && (
                <span className="ide-loading-badge ide-loading-badge-success">✓ Frontend Ready</span>
              )}
              {generationStatus?.has_backend && (
                <span className="ide-loading-badge ide-loading-badge-success">✓ Backend Ready</span>
              )}
              {!generationStatus?.has_frontend && !generationStatus?.is_generating && (
                <span className="ide-loading-badge">⏳ Frontend Pending</span>
              )}
              {!generationStatus?.has_backend && !generationStatus?.is_generating && (
                <span className="ide-loading-badge">⏳ Backend Pending</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ide-layout">
        <div className="ide-sidebar">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile?.path}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </div>

        <div className="ide-main">
          <div className="ide-editor-section">
            <CodeEditor
              selectedFile={selectedFile}
              openFiles={openFiles}
              onFileSelect={(file) => setSelectedFile(file)}
              onCloseFile={handleCloseFile}
              onContentChange={handleFileContentChange}
            />
          </div>

          <div className="ide-bottom-panel">
            <Terminal ref={terminalRef} workingDir={null} />
          </div>
        </div>

        <div className="ide-right-panel">
          <AgentsPanel 
            agents={[]}
            onStatusChange={() => {}}
            onPriorityChange={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

export default IDE

