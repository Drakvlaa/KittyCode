import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/mode-text'
import "ace-builds/src-noconflict/mode-python";
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'
import { useState, useEffect, useRef } from 'react'

Array.prototype.copy = function () {
  return [...this]
}

Array.prototype.delete = function (index) {
  return [...this.slice(0, index), ...this.slice(index + 1)]
}

Array.prototype.add = function (index, element) {
  return [...this.slice(0, index), element, ...this.slice(index)]
}

class FileClass {
  constructor() {
    this.path = ''
    this.code = ''
    this.cursorPosition = { row: 0, column: 0 }
    this.mode = 'text'
  }
}

function App() {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(-1)
  const [mode, setMode] = useState('text')

  function handler(e) {
    const id = Number(e.target.id)
    if (isNaN(id) || selectedFile === id) return
    setSelectedFile(id)
  }

  function closeFileButton(e) {
    const id = Number(e.target.parentNode.id)
    closeFile(id)
  }

  function closeFile(id) {
    setFiles(files.delete(id))
    setSelectedFile(files.length - 2)
  }

  function selectLanguage() {
    files[selectedFile].mode = 'javascript'
    setFiles(files.copy())
  }

  function File({ path, id }, key) {
    return (
      <div
        key={key}
        id={id}
        className={`file ${selectedFile === id ? 'selected' : ''}`}
        onClick={handler}
      >
        {path ? path : 'Untitled'}
        <div className="close" onClick={closeFileButton}>
          ✕
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (selectedFile > -1) setMode(files[selectedFile].mode)
    else setMode('text')

    ipcRenderer.on('getFile', () => {
      ipcRenderer.send('returnFile', files[selectedFile])
    })

    ipcRenderer.on('setNewPath', (args) => {
      files[selectedFile].path = args[0]
      setFiles(files.copy())
    })

    ipcRenderer.on('closeFile', () => {
      closeFile(selectedFile)
    })

    ipcRenderer.on('newFile', () => {
      setFiles([...files, new FileClass()])
      setSelectedFile(files.length)
    })

    ipcRenderer.on('nextFile', () => {
      if(files.length === 0) setSelectedFile(-1)
      else if (selectedFile === files.length - 1) setSelectedFile(0)
      else setSelectedFile(selectedFile + 1)
    })

    return () => {
      ipcRenderer.removeAllListeners('getFile')
      ipcRenderer.removeAllListeners('setNewPath')
      ipcRenderer.removeAllListeners('closeFile')
      ipcRenderer.removeAllListeners('newFile')
    }
  }, [files, selectedFile])

  return (
    <>
      <div className="filesTab">
        {files.map((element, i) => (
          <File key={i} id={i} path={element.path} />
        ))}
        <div className="scrollbar"></div>
      </div>
      <div id="code">
        {files.length > 0 && (files[selectedFile].mode === 'text' ? files[selectedFile].code.length === 0 : false) && (
            <div id="message">
              <span className="blue" onClick={selectLanguage}>
                Select a language
              </span>{' '}
              to get started.
              <br />
              Start typing to dismiss this.
            </div>
          )}
        {files.length > 0 && (
          <AceEditor
            height="100vh"
            width="100%"
            value={files[selectedFile].code}
            mode={mode}
            theme="monokai"
            fontSize="16px"
            onChange={(value) => {
              files[selectedFile].code = value
              setFiles(files.copy())
            }}
            highlightActiveLine={true}
            setOptions={{
              enableLiveAutocompletion: true,
              showLineNumbers: true,
              tabSize: 4
            }}
            showPrintMargin={false}
          />
        )}
      </div>

      {files.length === 0 && (
        <div className="centered">
          New File&nbsp;<span className="key">Ctrl</span>&nbsp;+&nbsp;<span className="key">N</span>
        </div>
        )}
    </>
  )
}

export default App
