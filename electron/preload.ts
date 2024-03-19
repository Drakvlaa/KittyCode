import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (event: string, data: unknown) => ipcRenderer.send(event, data),
  on: (event: string, fn: (arg0: unknown[]) => void) => ipcRenderer.on(event, (_event, ...args) => fn(args)),
  removeAllListeners: (event: string) => {
    ipcRenderer.removeAllListeners(event);
  }
});

contextBridge.exposeInMainWorld("process", {
  electron: process.versions.electron,
  node: process.versions.node
});
