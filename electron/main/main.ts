import path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import {
  saveCredential,
  removeCredential,
  hasCredential,
} from "../platform-login/credential-store";
import { openLoginWindow, clearPlatformSession } from "../platform-login/login-window";
import { PLATFORMS, getPlatform } from "../platform-login/platforms";
import { GatewayProcess } from "./gateway-process";
import { createAppMenu } from "./menu";
import { createTray, destroyTray } from "./tray";
import { loadWindowState, saveWindowState, applyWindowState } from "./window-manager";

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
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
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

  applyWindowState(mainWindow, windowState);

  // Debounce saves so rapid resize/move events don't thrash the disk.
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      if (mainWindow) {
        saveWindowState(mainWindow);
      }
    }, 500);
  };

  mainWindow.on("resize", debouncedSave);
  mainWindow.on("move", debouncedSave);
  mainWindow.on("maximize", debouncedSave);
  mainWindow.on("unmaximize", debouncedSave);

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

// platform.*
ipcMain.handle("freeclaw:platform:list", () =>
  PLATFORMS.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    connected: hasCredential(p.id),
  })),
);

ipcMain.handle("freeclaw:platform:login", async (_event, platformId: string) => {
  if (!mainWindow) {
    return { ok: false, error: "No main window" };
  }
  const platform = getPlatform(platformId);
  if (!platform) {
    return { ok: false, error: `Unknown platform: ${platformId}` };
  }

  const result = await openLoginWindow(platformId, mainWindow);
  if (result.ok && result.credentials) {
    saveCredential(platformId, result.credentials);
    // Notify renderer of updated status.
    broadcastPlatformStatus();
  }
  return { ok: result.ok, error: result.error };
});

ipcMain.handle("freeclaw:platform:logout", async (_event, platformId: string) => {
  removeCredential(platformId);
  await clearPlatformSession(platformId);
  broadcastPlatformStatus();
});

ipcMain.handle("freeclaw:platform:status", () => buildPlatformStatus());

function buildPlatformStatus(): Record<string, { connected: boolean }> {
  const status: Record<string, { connected: boolean }> = {};
  for (const p of PLATFORMS) {
    status[p.id] = { connected: hasCredential(p.id) };
  }
  return status;
}

function broadcastPlatformStatus(): void {
  const status = buildPlatformStatus();
  mainWindow?.webContents.send("freeclaw:platform:statusChange", status);
}

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

  createAppMenu(mainWindow);

  createTray({
    onShow: () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow(gateway.port);
      }
    },
    onQuit: () => {
      app.quit();
    },
    getStatus: () => {
      return gateway.status === "running" ? "已连接" : "未连接";
    },
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(gateway.port);
    }
  });
});

app.on("before-quit", () => {
  console.log("[main] Stopping gateway before quit...");
  destroyTray();
  // Fire-and-forget; the process will be killed regardless on app exit
  // since detached: false. But we try a clean shutdown.
  void gateway.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
