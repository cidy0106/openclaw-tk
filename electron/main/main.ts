import path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  const preloadPath = path.join(__dirname, "preload.cjs");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f1a",
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    void mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "control-ui", "index.html");
    void mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────

// app.*
ipcMain.handle("freeclaw:app:getVersion", () => app.getVersion());
ipcMain.handle("freeclaw:app:openExternal", (_event, url: string) => shell.openExternal(url));

// gateway.* (stubs — real implementation comes in later tasks)
ipcMain.handle("freeclaw:gateway:getPort", () => 3000);
ipcMain.handle("freeclaw:gateway:restart", () => {});
ipcMain.handle("freeclaw:gateway:status", () => "stopped" as const);

// platform.* (stubs — real implementation comes in later tasks)
ipcMain.handle("freeclaw:platform:list", () => []);
ipcMain.handle("freeclaw:platform:login", () => ({
  ok: false,
  error: "not implemented",
}));
ipcMain.handle("freeclaw:platform:logout", () => {});
ipcMain.handle("freeclaw:platform:status", () => ({}));

// ── App lifecycle ─────────────────────────────────────────────────────

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
