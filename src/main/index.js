import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import * as fs from 'fs'

function saveFile(path, code) {
  fs.writeFile(path, code, function (err) {
    if (err) throw err
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

  mainWindow.webContents.openDevTools()
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 's') {
      mainWindow.webContents.send('getFile')
      event.preventDefault()
    }

    if (input.control && input.key.toLowerCase() === 'n') {
      mainWindow.webContents.send('newFile')
      event.preventDefault()
    }

    if (input.control && (input.key.toLowerCase() === 'w' || input.key.toLowerCase() === 'f4')) {
      mainWindow.webContents.send('closeFile')
      event.preventDefault()
    }

    if (input.control && input.key.toLowerCase() === 'tab') {
      mainWindow.webContents.send('nextFile')
      event.preventDefault()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  ipcMain.on('returnFile', async (event, ...args) => {
    let { path, code } = args[0]
    if (path.length === 0) {
      dialog.showSaveDialog().then((result) => {
        if (result.canceled) return
        path = result.filePath
        mainWindow.webContents.send('setNewPath', path)
        saveFile(path, code)
      })
    } else {
      saveFile(path, code)
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
