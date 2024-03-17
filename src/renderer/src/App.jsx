import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/mode-html'
import 'ace-builds/src-noconflict/mode-text'
import 'ace-builds/src-noconflict/mode-python'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'
import { useState, useEffect, useRef } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

const languages = [
  { name: 'JavaScript', extension: '(js)', mode: 'javascript' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'HTML', extension: '(html)', mode: 'html' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' },
  { name: 'Python', extension: '(py)', mode: 'python' }
].sort((a, b) => a.name.localeCompare(b.name))

class FileClass {
  constructor({ type, subtype, path, data, name } = {}) {
    this.type = type || ''
    this.mode = subtype && subtype !== 'plain' ? subtype : 'text'
    this.path = path || ''
    this.data = data || ''
    this.name = name || 'Untitled'
    this.cursorPosition = { row: 0, column: 0 }
  }
}

let fileTreeData = {
};

function TreeNode({ node, className }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleToggle = () => {
    if(node.type === 'directory') setIsOpen(!isOpen)
    else ipcRenderer.send('openFile', node.path)
  }
  
  return (
    <>
    <div className={className ? className : 'leftPanelTabElement'} onClick={handleToggle} title={node.path}>
      {node.type === 'directory' && (isOpen ? '▼ ' : '► ')}
      {node.name ? node.name : 'NO FOLDER OPENED'}
    </div>
    {node.type === 'directory' && isOpen && (
      <div style={{ marginLeft: '20px' }}>
          {node.children.map(child => (
            <TreeNode key={child.name} node={child} />
          ))}
        </div>
    )}
  </>)
}

function App() {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(0)

  const [showLeftPanel, setShowLeftPanel] = useState(true)

  const [modal, setModal] = useState(null)
  const [modalSelectedOption, setModalSelectedOption] = useState(0)
  const [modalInputText, setModalInputText] = useState('')

  const ace = useRef()
  const modalSelectedOptionRef = useRef()

  const handleModalInput = (e) => {
    var lowerCase = e.target.value.toLowerCase()
    setModalInputText(lowerCase)
  }

  const handleFileClick = (id) => {
    setSelectedFile(id)
  }

  const handleCloseFile = (id) => {
    const updatedFiles = files.filter((_, index) => index !== id)
    setFiles(updatedFiles)
    setSelectedFile(Math.max(0, Math.min(id, files.length - 2)))
  }

  const handleSelectLanguage = () => {
    setModal('selectLanguage')
  }

  const filterLanguages = () => {
    return languages.filter((lang) => {
      if (lang.name.includes(modalInputText) || lang.mode.includes(modalInputText) || lang.extension.includes(modalInputText)) return lang
    })
  }

  const selectLanguage = (lang) => {
    const updatedFiles = [...files]
    updatedFiles[selectedFile].mode = lang
    setFiles(updatedFiles)
    setModal(null)
    setModalInputText('')
  }

  useEffect(() => {
    if (files.length === 0 && modal === 'selectLanguage') setModal(null)

    const handleGetFile = () => {
      ipcRenderer.send('getFile', files[selectedFile])
    }

    const handleSetNewPath = (args) => {
      const updatedFiles = [...files]
      updatedFiles[selectedFile].path = args[0].path
      updatedFiles[selectedFile].name = args[0].name
      setFiles(updatedFiles)
    }

    const handleCloseFile = () => {
      const updatedFiles = files.filter((_, index) => index !== selectedFile)
      setFiles(updatedFiles)
      setSelectedFile(Math.max(Math.min(selectedFile, files.length - 2), 0))
    }

    const handleNewFile = (args) => {
      setFiles([...files, new FileClass(args[0])])
      setSelectedFile(files.length)
    }

    const handleFilesFromArray = (args) => {
      const newFiles = args[0].map((file) => new FileClass(file))
      setFiles([...files, ...newFiles])
      setSelectedFile(files.length + newFiles.length - 1)
    }

    const handleNextFile = () => {
      if (files.length === 0) setSelectedFile(0)
      else setSelectedFile((selectedFile + 1) % files.length)
    }

    const handleOpenFolder = (args) => {
      fileTreeData = args[0]
      setFiles([...files])
    }

    ipcRenderer.on('getFile', handleGetFile)
    ipcRenderer.on('setNewPath', handleSetNewPath)
    ipcRenderer.on('closeFile', handleCloseFile)
    ipcRenderer.on('newFile', handleNewFile)
    ipcRenderer.on('filesFromArray', handleFilesFromArray)
    ipcRenderer.on('nextFile', handleNextFile)
    ipcRenderer.on('openFolder', handleOpenFolder)

    return () => {
      ipcRenderer.removeAllListeners('getFile')
      ipcRenderer.removeAllListeners('setNewPath')
      ipcRenderer.removeAllListeners('closeFile')
      ipcRenderer.removeAllListeners('newFile')
      ipcRenderer.removeAllListeners('filesFromArray')
      ipcRenderer.removeAllListeners('nextFile')
      ipcRenderer.removeAllListeners('openFolder')
    }
  }, [files, selectedFile])

  useEffect(() => {
    ipcRenderer.send('save', files)
  }, [files])

  useEffect(() => {
    const handleEscape = () => {
      setModal(null)
    }

    const handleArrowUp = () => {
      setModalSelectedOption(
        modalSelectedOption > 0 ? modalSelectedOption - 1 : filterLanguages().length - 1
      )
    }

    const handleArrowDown = () => {
      setModalSelectedOption(
        modalSelectedOption < filterLanguages().length - 1 ? modalSelectedOption + 1 : 0
      )
    }

    const handleEnter = () => {
      if(filterLanguages().length > 0) selectLanguage(filterLanguages()[modalSelectedOption].mode)
    }

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowup') handleArrowUp()
      else if (key === 'arrowdown') handleArrowDown()
      else if (key === 'enter') handleEnter()
      else if (key === 'escape') handleEscape()
    }

    if (modal !== null) {
      document.body.addEventListener('keydown', handleKeyDown)
      document.body.addEventListener('mousedown', handleEscape)
      modalSelectedOptionRef.current?.scrollIntoView({ block: 'nearest' })
    }

    return () => {
      document.body.removeEventListener('keydown', handleKeyDown)
      document.body.removeEventListener('mousedown', handleEscape)
    }
  }, [modal, modalSelectedOption, modalInputText])

  useEffect(() => {
    if (modal === null && ace.current) setTimeout(() => ace.current.editor.focus(), 0)
  }, [modal, files, selectedFile])

  useEffect(() => {
    setModalSelectedOption(0)
  }, [modalInputText])

  useEffect(() => {
    const closeSidePanel = () => {
      setShowLeftPanel(!showLeftPanel)
    }

    ipcRenderer.on('closeSidePanel', closeSidePanel)

    return () => {
      ipcRenderer.removeAllListeners('closeSidePanel')
    }
  }, [showLeftPanel])

  return (
    <>
    <div id='titleBar'>
      <div id="menuBar">
        <div>File</div>
        <div>Edit</div>
        <div>Terminal</div>
        <div>Help</div>
        <div>{'<------- przyciski tymczasowo nie działają'}</div>
      </div>
      <div id='windowControls'>
        <div onClick={() => {
          ipcRenderer.send('minimize')
        }}>—</div>
        <div onClick={() => {
          ipcRenderer.send('maximize')
        }}>▢</div>
        <div onClick={() => {
          ipcRenderer.send('close')
        }}>✕</div>
      </div>
    </div>
      {modal === 'selectLanguage' && (
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <input
            type="text"
            onChange={handleModalInput}
            placeholder="Select Language Mode"
          />
          <div className="languagesList">
            {filterLanguages().map((lang, i) => {
              return (
                <div
                  ref={i === modalSelectedOption ? modalSelectedOptionRef : null}
                  className={i === modalSelectedOption ? 'modalSelectedOption' : 'modalOption'}
                  key={i}
                  onClick={() => {
                    selectLanguage(lang.mode)
                  }}
                >
                  {lang.name + ' '}
                  <span className="languageExtension">{lang.extension}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <PanelGroup direction="horizontal" id="allPanels">
        {showLeftPanel && (
          <>
          <Panel defaultSize={20} minSize={20} id={1} order={1}>
          <div className='leftPanelTab'>
            <div className='leftPanelTabTitle'>OPEN EDITORS</div>
          </div>
          <div className='leftPanelTab'>
            <TreeNode node={fileTreeData} className='leftPanelTabTitle' />
          </div>
          </Panel>
          <PanelResizeHandle />
          </>
        )}
        <Panel minSize={20} id={2} order={2}>
        <div className="filesTab">
        {files.map((element, i) => (
          <div
            key={i}
            className={selectedFile === i ? 'selectedFileTab' : 'fileTab'}
            title={element.path}
            onClick={() => handleFileClick(i)}
          >
            {element.name}
            <div className="closeFileTab" onClick={(e) => {handleCloseFile(i); e.stopPropagation()}}>
              ✕
            </div>
          </div>
        ))}
      </div>
      <div id='rightPanel'>
        {files.length > 0 && files[selectedFile] &&
          files[selectedFile].mode === 'text' &&
          files[selectedFile].data.length === 0 &&
          files[selectedFile].path === '' && (
            <div id="selectLanguageMessage">
              <span className="link" onClick={handleSelectLanguage}>
                Select a language
              </span>{' '}
              to get started.
              <br />
              Start typing to dismiss this.
            </div>
          )}

        {files.length > 0 && files[selectedFile] && (
          <AceEditor
            ref={ace}
            height="100%"
            width="100%"
            value={files[selectedFile].data}
            mode={files[selectedFile].mode}
            theme="monokai"
            fontSize="16px"
            onChange={(value) => {
              const updatedFiles = [...files]
              updatedFiles[selectedFile].data = value
              setFiles(updatedFiles)
            }}
            highlightActiveLine={true}
            setOptions={{
              enableLiveAutocompletion: true,
              showLineNumbers: true,
              tabSize: 4
            }}
            showPrintMargin={false}
            editorProps={{ $blockScrolling: true }}
          />
        )}
        </div>
        </Panel>
      </PanelGroup>

      {files.length === 0 && (
        <div className="mainPanel noSelection">
          <h1>
            ~/car_code<span id="titleVersion"> v1.0.0</span>
          </h1>
          <div>
            New File <span className="key">Ctrl</span> + <span className="key">N</span>
          </div>
          <div>
            Open File <span className="key">Ctrl</span> + <span className="key">O</span>
          </div>
          <div>
            Open Folder <span className="key">Ctrl</span> + <span className="key">K</span>
          </div>
        </div>
      )}
    </>
  )
}

export default App
