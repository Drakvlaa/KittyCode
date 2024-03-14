const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (event, data) => ipcRenderer.send(event, data),
  on: (event, fn) => ipcRenderer.on(event, (event, ...args) => fn(args)),
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event)
})