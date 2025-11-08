import { useState } from 'react'
import './FileExplorer.css'

function FileExplorer({ files, onFileSelect, selectedFile, onCreateFile, onCreateFolder, onDeleteFile, onRenameFile }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src']))
  const [activeTab, setActiveTab] = useState('files')
  const [contextMenu, setContextMenu] = useState(null)
  const [renamingPath, setRenamingPath] = useState(null)
  const [newName, setNewName] = useState('')

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath)
      } else {
        newSet.add(folderPath)
      }
      return newSet
    })
  }

  const handleContextMenu = (e, path, type) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, path, type })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleRename = (path, oldName) => {
    setRenamingPath(path)
    setNewName(oldName)
    setContextMenu(null)
  }

  const confirmRename = () => {
    if (newName && newName !== '') {
      onRenameFile(renamingPath, newName)
      setRenamingPath(null)
      setNewName('')
    }
  }

  const cancelRename = () => {
    setRenamingPath(null)
    setNewName('')
  }

  const handleDelete = (path, type) => {
    if (window.confirm(`Are you sure you want to delete ${path}?`)) {
      onDeleteFile(path, type)
    }
    setContextMenu(null)
  }

  const handleNewFile = (parentPath = '') => {
    const fileName = prompt('Enter file name:')
    if (fileName) {
      onCreateFile(fileName, parentPath)
    }
    setContextMenu(null)
  }

  const handleNewFolder = (parentPath = '') => {
    const folderName = prompt('Enter folder name:')
    if (folderName) {
      onCreateFolder(folderName, parentPath)
    }
    setContextMenu(null)
  }

  const renderFileTree = (fileTree, path = '') => {
    const items = []

    for (const [name, item] of Object.entries(fileTree)) {
      const currentPath = path ? `${path}/${name}` : name
      const isSelected = selectedFile === currentPath

      if (item.type === 'folder') {
        const isExpanded = expandedFolders.has(currentPath)
        const isRenaming = renamingPath === currentPath
        items.push(
          <div key={currentPath} className="file-tree-item">
            <div
              className={`folder-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleFolder(currentPath)}
              onContextMenu={(e) => handleContextMenu(e, currentPath, 'folder')}
            >
              <span className={`folder-icon ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded ? '▼' : '▶'}
              </span>
              {isRenaming ? (
                <input
                  type="text"
                  className="rename-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={cancelRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="folder-name">{name}</span>
              )}
            </div>
            {isExpanded && item.children && (
              <div className="folder-children">
                {renderFileTree(item.children, currentPath)}
              </div>
            )}
          </div>
        )
      } else if (item.type === 'file') {
        const isRenaming = renamingPath === currentPath
        items.push(
          <div
            key={currentPath}
            className={`file-item ${isSelected ? 'selected' : ''}`}
            onClick={() => !isRenaming && onFileSelect(currentPath)}
            onContextMenu={(e) => handleContextMenu(e, currentPath, 'file')}
          >
            <span className="file-icon">📄</span>
            {isRenaming ? (
              <input
                type="text"
                className="rename-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={cancelRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') cancelRename()
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="file-name">{name}</span>
            )}
          </div>
        )
      }
    }

    return items
  }

  return (
    <div className="file-explorer" onClick={closeContextMenu}>
      <div className="explorer-tabs">
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button
          className={`tab ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          Git
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="file-toolbar">
          <button className="toolbar-btn" onClick={() => handleNewFile('')} title="New File">
            <span>📄+</span>
          </button>
          <button className="toolbar-btn" onClick={() => handleNewFolder('')} title="New Folder">
            <span>📁+</span>
          </button>
        </div>
      )}

      <div className="file-tree">
        {activeTab === 'files' && renderFileTree(files)}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && (
            <>
              <div className="context-menu-item" onClick={() => handleNewFile(contextMenu.path)}>
                📄 New File
              </div>
              <div className="context-menu-item" onClick={() => handleNewFolder(contextMenu.path)}>
                📁 New Folder
              </div>
              <div className="context-menu-separator"></div>
            </>
          )}
          <div className="context-menu-item" onClick={() => handleRename(contextMenu.path, contextMenu.path.split('/').pop())}>
            ✏️ Rename
          </div>
          <div className="context-menu-item delete" onClick={() => handleDelete(contextMenu.path, contextMenu.type)}>
            🗑️ Delete
          </div>
        </div>
      )}
    </div>
  )
}

export default FileExplorer

