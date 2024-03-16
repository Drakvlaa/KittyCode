import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/mode-text'
import "ace-builds/src-noconflict/mode-python";
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'
import { useState, useEffect, useRef } from 'react'

const languages = [
  'javascript',
  'python'
]

class FileClass {
  constructor({ type, subtype, path, data, name } = {}) {
    this.type = type || ''
    this.mode = subtype && subtype !== "plain" ? subtype : 'text'
    this.path = path || ''
    this.data = data || ''
    this.name = name || 'Untitled'
    this.cursorPosition = { row: 0, column: 0 }
  }
}

function App() {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(-1)
  const [modal, setModal] = useState(null)
  const [inputText, setInputText] = useState("");
  const ace = useRef()

  useEffect(() => {
    const handleGetFile = () => {
      console.log({files, selectedFile})
      ipcRenderer.send('getFile', files[selectedFile]);
    };

    const handleSetNewPath = (args) => {
      const updatedFiles = [...files];
      updatedFiles[selectedFile].path = args[0].path;
      updatedFiles[selectedFile].name = args[0].name;
      setFiles(updatedFiles);
    };

    const handleCloseFile = () => {
      const updatedFiles = files.filter((_, index) => index !== selectedFile);
      setFiles(updatedFiles);
      setSelectedFile(Math.max(selectedFile - 1, 0));
    };

    const handleNewFile = (args) => {
      setFiles([...files, new FileClass(args[0])]);
      setSelectedFile(files.length);
    };

    const handleFilesFromArray = (args) => {
      const newFiles = args[0].map(file => new FileClass(file));
      setFiles([...files, ...newFiles]);
      setSelectedFile(files.length + newFiles.length - 1);
    };

    const handleNextFile = () => {
      if (files.length === 0) setSelectedFile(-1);
      else setSelectedFile((selectedFile + 1) % files.length);
    };

    const escape = () => {
      setModal(null)
    };

    ipcRenderer.on('getFile', handleGetFile);
    ipcRenderer.on('setNewPath', handleSetNewPath);
    ipcRenderer.on('closeFile', handleCloseFile);
    ipcRenderer.on('newFile', handleNewFile);
    ipcRenderer.on('filesFromArray', handleFilesFromArray);
    ipcRenderer.on('nextFile', handleNextFile);
    ipcRenderer.on('escape', escape);

    return () => {
      ipcRenderer.removeAllListeners()
    }
  }, [files, selectedFile])

  useEffect(() => {
    ipcRenderer.send('save', files)
  }, [files])

  const handleModalInput = (e) => {
    var lowerCase = e.target.value.toLowerCase();
    setInputText(lowerCase);
  };

  const handleFileClick = (id) => {
    setSelectedFile(id);
  };

  const handleFileClose = (id) => {
    closeFile(id);
  };

  const closeFile = (id) => {
    setSelectedFile(selectedFile - 1);
    setFiles(files.filter((_, index) => index !== id));
  };

  const handleSelectLanguage = () => {
    setModal('selectLanguage')
  }

  const selectLanguage = (lang) => {
    const updatedFiles = [...files];
    updatedFiles[selectedFile].mode = lang
    setFiles(updatedFiles)
    setModal(null)
    setInputText("")
  }

  return (
    <>
      {modal === 'selectLanguage' && (
        <div className='modal'>
          <input type="text" onChange={handleModalInput} placeholder="Select Language Mode" />
          {languages.map((lang, i) => {
            if(lang.includes(inputText))
            return (
              <div key={i} onClick={() => {
                selectLanguage(lang);
              }}>{lang}</div>
          )})}
        </div>
      )}
      <div className="filesTab">
        {files.map((element, i) => (
          <div
            key={i}
            className={`file ${selectedFile === i ? 'selected' : ''}`}
            title={element.path}
            onClick={() => handleFileClick(i)}
          >
            {element.name}
            <div className="close" onClick={() => handleFileClose(i)}>
              ✕
            </div>
          </div>
        ))}
      </div>
      <div id="code">
        {files.length > 0 &&
          files[selectedFile].mode === 'text' &&
          files[selectedFile].data.length === 0 &&
          files[selectedFile].path === '' && (
            <div id="message">
              <span className="blue" onClick={handleSelectLanguage}>
                Select a language
              </span>{' '}
              to get started.
              <br />
              Start typing to dismiss this.
            </div>
          )}

        {files.length > 0 && (
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

      {files.length === 0 && (
        <div className="centered unsel">
          <h1>
            {process.name}
            <span id="version"> v{process.version}</span>
          </h1>
          <div>
            New File <span className="key">Ctrl</span> + <span className="key">N</span>
          </div>
          <div>
            Open File <span className="key">Ctrl</span> + <span className="key">O</span>
          </div>
        </div>
      )}
    </>
  )
}

export default App
