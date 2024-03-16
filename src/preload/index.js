const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (event, data) => ipcRenderer.send(event, data),
  on: (event, fn) => ipcRenderer.on(event, (event, ...args) => fn(args)),
  removeAllListeners: (event) => {
    if (event) ipcRenderer.removeAllListeners(event)
    else ipcRenderer.removeAllListeners()
  }
})

contextBridge.exposeInMainWorld('process', {
  electron: process.versions.electron,
  node: process.versions.node,
  version: process.env.npm_package_version,
  name: process.env.npm_package_name
})
