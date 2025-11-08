import { useRef } from 'react'
import './CodeEditor.css'

function CodeEditor({ selectedFile, openFiles, onFileSelect, onCloseFile, onContentChange }) {
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)

  const handleContentChange = (e) => {
    if (selectedFile) {
      onContentChange(selectedFile.path, e.target.value)
    }
  }

  const handleScroll = (e) => {
    // Sync scroll between textarea and highlight overlay
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop
      highlightRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  const getLanguage = (filename) => {
    const ext = filename.split('.').pop()
    const langMap = {
      'py': 'python',
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
    }
    return langMap[ext] || 'text'
  }

  const highlightSyntax = (code, language) => {
    if (!code) return ''
    
    // Escape HTML
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    if (language === 'python') {
      // Keywords
      highlighted = highlighted.replace(/\b(def|class|if|else|elif|for|while|return|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|True|False|None|and|or|not|in|is|global|nonlocal|assert|del|async|await)\b/g, '<span class="keyword">$1</span>')
      // Strings
      highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
      // Comments
      highlighted = highlighted.replace(/#.*$/gm, '<span class="comment">$&</span>')
      // Numbers
      highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>')
    } else if (language === 'javascript' || language === 'typescript') {
      // Keywords
      highlighted = highlighted.replace(/\b(const|let|var|function|class|if|else|for|while|return|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|declare|public|private|protected|static|readonly|abstract|typeof|instanceof|in|of|true|false|null|undefined|void|as|is)\b/g, '<span class="keyword">$1</span>')
      // Strings
      highlighted = highlighted.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="comment">$1</span>')
      // Numbers
      highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>')
    } else if (language === 'java') {
      // Keywords
      highlighted = highlighted.replace(/\b(public|private|protected|static|final|abstract|class|interface|extends|implements|if|else|for|while|switch|case|break|continue|return|try|catch|finally|throw|throws|new|this|super|import|package|void|int|long|float|double|boolean|char|String|true|false|null|void|static|final|abstract|synchronized|volatile|transient|native|strictfp)\b/g, '<span class="keyword">$1</span>')
      // Strings
      highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="comment">$1</span>')
    } else if (language === 'css') {
      // Selectors
      highlighted = highlighted.replace(/([^{}\s]+)(?=\s*{)/g, '<span class="selector">$1</span>')
      // Properties
      highlighted = highlighted.replace(/([a-z-]+)(?=\s*:)/g, '<span class="property">$1</span>')
      // Values
      highlighted = highlighted.replace(/(:\s*)([^;]+)(?=;)/g, '$1<span class="value">$2</span>')
      // Comments
      highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
    } else if (language === 'html') {
      // Tags
      highlighted = highlighted.replace(/(&lt;\/?)([\w-]+)([^&]*?)(&gt;)/g, '$1<span class="tag">$2</span>$3$4')
      // Attributes
      highlighted = highlighted.replace(/(\w+)(=)(["'][^"']*["'])/g, '<span class="attribute">$1</span>$2<span class="string">$3</span>')
      // Comments
      highlighted = highlighted.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>')
    } else if (language === 'json') {
      // Keys
      highlighted = highlighted.replace(/(["'])([^"']+)\1(?=\s*:)/g, '<span class="property">$1$2$1</span>')
      // Strings
      highlighted = highlighted.replace(/(:\s*)(["'])(?:(?=(\\?))\3.)*?\2/g, '$1<span class="string">$2$4$2</span>')
      // Numbers
      highlighted = highlighted.replace(/(:\s*)(\d+\.?\d*)/g, '$1<span class="number">$2</span>')
      // Booleans and null
      highlighted = highlighted.replace(/(:\s*)(true|false|null)\b/g, '$1<span class="keyword">$2</span>')
    }

    return highlighted
  }

  const getFileName = (path) => {
    return path.split('/').pop()
  }

  return (
    <div className="code-editor-container">
      <div className="editor-tabs">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`editor-tab ${selectedFile?.path === file.path ? 'active' : ''}`}
            onClick={() => onFileSelect(file)}
          >
            <span>{getFileName(file.path)}</span>
            <button
              className="close-tab"
              onClick={(e) => {
                e.stopPropagation()
                onCloseFile(file.path)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="editor-content">
        {selectedFile ? (
          <div className="code-wrapper">
            <div className="line-numbers">
              {selectedFile.content.split('\n').map((_, index) => (
                <div key={index} className="line-number">{index + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="code-textarea"
              value={selectedFile.content}
              onChange={handleContentChange}
              onScroll={handleScroll}
              spellCheck={false}
              data-language={getLanguage(selectedFile.path)}
            />
            <pre ref={highlightRef} className="code-highlight">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightSyntax(selectedFile.content, getLanguage(selectedFile.path))
                }}
              />
            </pre>
          </div>
        ) : (
          <div className="no-file-selected">
            <p>No file selected</p>
            <p className="hint">Select a file from the explorer to view its contents</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeEditor

