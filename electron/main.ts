import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'node:path'
import fs from "node:fs"
import mime from "mime"
import dirTree from "directory-tree";

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null
let watchers: fs.FSWatcher[] = [];

interface OpenFile {
    path: string,
    data: string,
    name: string
}

const send = (action: string) => () => mainWindow?.webContents.send(action);

const openFile = (filePath: string) => {
    return new Promise<OpenFile>((resolve, reject) => {
        fs.readFile(filePath, "utf-8", (err, data) => {
            if (err) reject(err);
            resolve({
                path: filePath,
                data: data,
                name: path.basename(filePath)
            });
        });
    });
}

const saveFile = (path: string, data: string) => {
    fs.writeFile(path, data, (callback) => {
        if (callback) console.error(callback);
    });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 900,
    height: 670,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
  })

  mainWindow.removeMenu();

  mainWindow.webContents.on("before-input-event", (event, input) => {

    const shortcut = (sc: string, fn: { (): void | undefined; (): void | undefined; (): void | undefined; (): void | undefined; (): void | undefined; (): void | undefined; (): void; (): void; (): void; }, prevent = true) => {
      const keys = sc.toLowerCase().split("+");
      const ctrl = keys.includes("ctrl" || "control");
      const shift = keys.includes("shift");
      const key = keys.filter((key) => key !== "ctrl" && key !== "shift");
      if (ctrl == input.control && shift == input.shift && key.toString() == input.key.toLowerCase()) {
        fn();
        if (prevent) event.preventDefault();
      }
    };

    shortcut("ctrl+s", send("saveFile"));
    shortcut("ctrl+n", send("newFile"));
    shortcut("ctrl+w", send("closeFile"));
    shortcut("ctrl+f4", send("closeFile"));
    shortcut("ctrl+tab", send("nextFile"));
    shortcut("ctrl+b", send("closeSidePanel"));
    shortcut("ctrl+k", () => {
      dialog
        .showOpenDialog(mainWindow!, {
          properties: ["openDirectory"]
        })
        .then((result) => {
          if (result.canceled) return;
          const tree = dirTree(result.filePaths[0], { attributes: ["type", "extension"] });
          mainWindow?.webContents.send("openFolder", tree);
        })
        .catch((err) => {
          console.error(err);
        });
    });
    shortcut("ctrl+o", () => {
      dialog
        .showOpenDialog(mainWindow!, {
          properties: ["openFile"]
        })
        .then((result) => {
          if (result.canceled) return;
          openFile(result.filePaths[0]).then((result) => {
            try {
              const lookup = mime.getType(result.path);
              if (!lookup) throw new Error(`Unknown type of file ${result.path}`);

              const [type, subtype] = lookup.split("/");

              if (type !== "text" && type !== "application")
                throw new Error(`Unsupported file type ${lookup}`);

              mainWindow?.webContents.send("openFile", { ...result, type, subtype });
            } catch (err) {
              console.error(err);
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });
    });
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile('dist/index.html')
    // mainWindow.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  ipcMain.on("minimize", () => mainWindow?.minimize())
  ipcMain.on("maximize", () => mainWindow?.maximize())
  ipcMain.on("close", () => mainWindow?.close())
  ipcMain.on("openFile", (_event, ...args) => {
    openFile(args[0]).then((result) => {
        try {
          const lookup = mime.getType(result.path);
          if (!lookup) throw new Error(`Unknown type of file '${result.path}'`);
  
          const [type, subtype] = lookup.split("/");
  
          if (type !== "text" && type !== "application")
            throw new Error(`Unsupported file type ${lookup}`);
  
          mainWindow?.webContents.send("openFile", { ...result, type, subtype });
        } catch (error) {
          console.error(error);
        }
      });
  })
  ipcMain.on("saveFile", (_event, ...args) => {
    const { filepath, data } = args[0];
    if (filepath.length === 0) {
      dialog.showSaveDialog({}).then((result) => {
        if (result.canceled) return;
        const newPath = result.filePath!;
        const name = path.basename(newPath);
        mainWindow?.webContents.send("setNewPath", { path: newPath, name });
        saveFile(newPath, data);
      });
    } else {
      saveFile(filepath, data);
    }
  });
  ipcMain.on("watchFiles", (_event, ...args) => {
    watchers.forEach((watcher) => {
      watcher.close();
    });
    watchers = args[0]
      .filter((file: { path: string; }) => fs.existsSync(file.path))
      .map((file: { path: string; }) => {
        return fs.watch(file.path, (eventname: string) => {
          if (eventname === "change") {
            openFile(file.path).then((result) => {
              mainWindow?.webContents.send("updateFile", { ...result });
            });
          }
        });
      });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0)
    createWindow()
});

app.whenReady().then(createWindow);
