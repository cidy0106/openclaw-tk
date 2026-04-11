import path from "node:path";
import { Tray, Menu, nativeImage, app } from "electron";

let tray: Tray | null = null;

export function createTray(callbacks: {
  onShow: () => void;
  onQuit: () => void;
  getStatus: () => string;
}): Tray {
  // Load the tray icon — use @2x for Retina displays
  const assetsDir = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "..", "..", "assets");

  let icon = nativeImage.createFromPath(path.join(assetsDir, "tray-icon.png"));
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 18, height: 18 });
  }
  // Do NOT set as template image — we want to keep the red color

  tray = new Tray(icon);
  tray.setToolTip("FreeClaw");

  const updateContextMenu = (): void => {
    const status = callbacks.getStatus();
    const contextMenu = Menu.buildFromTemplate([
      { label: `状态: ${status}`, enabled: false },
      { type: "separator" },
      { label: "显示窗口", click: callbacks.onShow },
      { type: "separator" },
      { label: "退出", click: callbacks.onQuit },
    ]);
    tray?.setContextMenu(contextMenu);
  };

  updateContextMenu();

  // Re-build the context menu on each right-click so the status stays fresh
  tray.on("right-click", updateContextMenu);

  // Left-click shows the window (macOS already shows context menu on click,
  // but on Windows/Linux this is the expected behaviour)
  tray.on("click", () => {
    callbacks.onShow();
  });

  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
