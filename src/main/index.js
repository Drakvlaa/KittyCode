import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join, basename } from "path";
import fs from "fs";
import mime from "mime-types";
import dirTree from "directory-tree";

const isDev = process.env.NODE_ENV === "development";
let watchers = [];

function saveFile(path, data) {
  fs.writeFile(path, data, (err) => {
    if (err) console.error(err);
  });
}

function openFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) reject(err);
      const name = basename(path);
      resolve({ path, data, name });
    });
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  mainWindow.removeMenu();

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const send = (action) => () => mainWindow.webContents.send(action);

    const shortcut = (sc, fn, prevent = true) => {
      const keys = sc.toLowerCase().split("+");
      const ctrl = keys.includes("ctrl" || "control");
      const shift = keys.includes("shift");
      const key = keys.filter((key) => key !== "ctrl" && key !== "shift");
      if (ctrl == input.control && shift == input.shift && key == input.key.toLowerCase()) {
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
        .showOpenDialog(mainWindow, {
          properties: ["openDirectory"]
        })
        .then((result) => {
          if (result.canceled) return;
          const tree = dirTree(result.filePaths[0], { attributes: ["type", "extension"] });
          mainWindow.webContents.send("openFolder", tree);
        })
        .catch((err) => {
          console.error(err);
        });
    });
    shortcut("ctrl+o", () => {
      dialog
        .showOpenDialog(mainWindow, {
          properties: ["openFile"]
        })
        .then((result) => {
          if (result.canceled) return;
          openFile(result.filePaths[0]).then((result) => {
            try {
              const lookup = mime.lookup(result.path);
              if (!lookup) throw new Error("Invalid file type");

              const [type, subtype] = lookup.split("/");

              if (type !== "text" && type !== "application")
                throw new Error(`Unsupported file type ${lookup}`);

              mainWindow.webContents.send("openFile", { ...result, type, subtype });
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

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  ipcMain.on("minimize", (_event, ..._args) => {
    mainWindow.minimize();
  });

  ipcMain.on("maximize", (_event, ..._args) => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.on("close", (_event, ..._args) => {
    mainWindow.close();
  });

  ipcMain.on("openFile", (_event, ...args) => {
    openFile(args[0]).then((result) => {
      try {
        const lookup = mime.lookup(result.path);
        if (!lookup) throw new Error("Invalid file type");

        const [type, subtype] = lookup.split("/");

        if (type !== "text" && type !== "application")
          throw new Error(`Unsupported file type ${lookup}`);

        mainWindow.webContents.send("openFile", { ...result, type, subtype });
      } catch (error) {
        console.error(error);
      }
    });
  });

  ipcMain.on("saveFile", (_event, ...args) => {
    let { path, data } = args[0];
    if (path.length === 0) {
      dialog.showSaveDialog().then((result) => {
        if (result.canceled) return;
        const newPath = result.filePath;
        const name = basename(newPath);
        mainWindow.webContents.send("setNewPath", { path: newPath, name });
        saveFile(newPath, data);
      });
    } else {
      saveFile(path, data);
    }
  });

  ipcMain.on("watchFiles", (_event, ...args) => {
    watchers.forEach((watcher) => {
      watcher.close();
    });
    watchers = args[0]
      .filter((file) => fs.existsSync(file.path))
      .map((file) => {
        return fs.watch(file.path, (eventname, _filename) => {
          if (eventname === "change") {
            openFile(file.path).then((result) => {
              mainWindow.webContents.send("updateFile", { ...result });
            });
          }
        });
      });
  });
}

app.whenReady().then(createWindow);

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
