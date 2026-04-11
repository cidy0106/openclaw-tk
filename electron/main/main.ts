import path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { GatewayProcess } from "./gateway-process";

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;
const gateway = new GatewayProcess();

// Forward gateway logs to the console.
gateway.on("log", (stream: string, data: string) => {
  const line = data.trimEnd();
  if (stream === "stderr") {
    console.error(`[gateway] ${line}`);
  } else {
    console.log(`[gateway] ${line}`);
  }
});

gateway.on("status", (status: string) => {
  console.log(`[gateway] status → ${status}`);
  // Notify renderer if window exists.
  mainWindow?.webContents.send("freeclaw:gateway:statusChanged", status);
});

function createWindow(gatewayPort: number): void {
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
    const url = new URL(devUrl);
    url.searchParams.set("gatewayPort", String(gatewayPort));
    void mainWindow.loadURL(url.toString());
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "control-ui", "index.html");
    void mainWindow.loadFile(indexPath, {
      query: { gatewayPort: String(gatewayPort) },
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────

// app.*
ipcMain.handle("freeclaw:app:getVersion", () => app.getVersion());
ipcMain.handle("freeclaw:app:openExternal", (_event, url: string) => shell.openExternal(url));

// gateway.*
ipcMain.handle("freeclaw:gateway:getPort", () => gateway.port);
ipcMain.handle("freeclaw:gateway:status", () => gateway.status);
ipcMain.handle("freeclaw:gateway:restart", async () => {
  const newPort = await gateway.restart();
  // Inform the renderer about the new port.
  mainWindow?.webContents.send("freeclaw:gateway:portChanged", newPort);
  return newPort;
});

// platform.* (stubs — real implementation comes in later tasks)
ipcMain.handle("freeclaw:platform:list", () => []);
ipcMain.handle("freeclaw:platform:login", () => ({
  ok: false,
  error: "not implemented",
}));
ipcMain.handle("freeclaw:platform:logout", () => {});
ipcMain.handle("freeclaw:platform:status", () => ({}));

// ── App lifecycle ─────────────────────────────────────────────────────

void app.whenReady().then(async () => {
  let port: number;
  try {
    port = await gateway.start();
    console.log(`[main] Gateway started on port ${port}`);
  } catch (err) {
    console.error("[main] Failed to start gateway:", err);
    // Still open the window so the user can see something.
    port = 0;
  }

  createWindow(port);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(gateway.port);
    }
  });
});

app.on("before-quit", () => {
  console.log("[main] Stopping gateway before quit...");
  // Fire-and-forget; the process will be killed regardless on app exit
  // since detached: false. But we try a clean shutdown.
  void gateway.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
