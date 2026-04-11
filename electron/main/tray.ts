import path from "node:path";
import { Tray, Menu, nativeImage, app } from "electron";

let tray: Tray | null = null;

export function createTray(callbacks: {
  onShow: () => void;
  onQuit: () => void;
  getStatus: () => string;
}): Tray {
  // Try to load the tray icon from assets
  const iconPath = path.join(
    app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, "..", ".."),
    "assets",
    "tray-icon.png",
  );

  let icon = nativeImage.createFromPath(iconPath);

  // Fallback to an empty 16x16 image if file not found
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    // Resize for macOS template image (16x16)
    icon = icon.resize({ width: 16, height: 16 });
  }

  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

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
