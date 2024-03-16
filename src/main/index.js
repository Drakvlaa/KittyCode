import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import fs from 'fs'
import mime from 'mime-types'
import config from '../../config.json'

const isDev = process.env.NODE_ENV === 'development'

function saveFile(path, data) {
  fs.writeFile(path, data, (err) => {
    if (err) console.error('Error saving file:', err)
  })
}

function openFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err)
      const name = basename(path)
      resolve({ path, data, name })
    })
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.removeMenu()

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const send = (action) => () => mainWindow.webContents.send(action)

    const shortcut = (sc, fn) => {
      const keys = sc.toLowerCase().split('+')
      const ctrl = keys.includes('ctrl' || 'control')
      const shift = keys.includes('shift')
      const key = keys.filter((key) => key !== 'ctrl' && key !== 'shift')
      if (ctrl == input.control && shift == input.shift && key == input.key.toLowerCase()) {
        fn()
        event.preventDefault()
      }
    }

    shortcut('ctrl+s', send('getFile'))
    shortcut('ctrl+n', send('newFile'))
    shortcut('ctrl+w', send('closeFile'))
    shortcut('ctrl+f4', send('closeFile'))
    shortcut('ctrl+tab', send('nextFile'))
    shortcut('escape', send('escape'))
    shortcut('ctrl+o', () => {
      dialog
        .showOpenDialog(mainWindow, {
          properties: ['openFile']
        })
        .then((result) => {
          if (result.canceled) return
          openFile(result.filePaths[0]).then((result) => {
            try {
              const lookup = mime.lookup(result.path)
              if (!lookup) throw new Error('Invalid file type')

              const [type, subtype] = lookup.split('/')

              if (type !== 'text' && type !== 'application')
                throw new Error(`Unsupported file type ${lookup}`)

              mainWindow.webContents.send('newFile', { ...result, type, subtype })
            } catch (error) {
              console.error(error)
            }
          })
        })
        .catch((err) => {
          console.error(err)
        })
    })
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    const files = []

    const requests = config.files.map((path) => {
      return openFile(path)
        .then((result) => {
          const lookup = mime.lookup(result.path)
          if (lookup && (lookup.startsWith('text/') || lookup.startsWith('application/'))) {
            files.push({ ...result, type: lookup.split('/')[0], subtype: lookup.split('/')[1] })
          }
        })
        .catch((error) => {
          console.error('Error reading file:', error)
        })
    })

    Promise.all(requests).then(() => mainWindow.webContents.send('filesFromArray', files))
  })

  ipcMain.on('save', (event, ...args) => {
    let files = args[0]
    const data = `{"files": ${JSON.stringify(files.map((file) => file.path))}}`
    saveFile(join(__dirname, '../../config.json'), data)
  })

  ipcMain.on('getFile', (event, ...args) => {
    let { path, data } = args[0]
    if (path.length === 0) {
      dialog.showSaveDialog().then((result) => {
        if (result.canceled) return
        const newPath = result.filePath
        const name = basename(newPath)
        mainWindow.webContents.send('setNewPath', { path: newPath, name })
        saveFile(newPath, data)
      })
    } else {
      saveFile(path, data)
    }
  })
}

app.whenReady().then(createWindow)

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
