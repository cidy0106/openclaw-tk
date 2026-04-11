import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrowserWindow, screen } from "electron";

const STATE_FILE = path.join(os.homedir(), ".freeclaw", "window-state.json");

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  maximized: false,
};

export function loadWindowState(): WindowState {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return { ...DEFAULT_STATE };
    }

    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state: WindowState = JSON.parse(raw);

    // Validate that the saved position is still within a visible display.
    if (state.x !== undefined && state.y !== undefined) {
      const displays = screen.getAllDisplays();
      const visible = displays.some((display) => {
        const { x, y, width, height } = display.workArea;
        return (
          state.x! >= x - 100 &&
          state.y! >= y - 100 &&
          state.x! < x + width &&
          state.y! < y + height
        );
      });

      if (!visible) {
        // Position is off-screen; drop it so Electron centers the window.
        delete state.x;
        delete state.y;
      }
    }

    // Clamp dimensions to reasonable minimums.
    state.width = Math.max(state.width ?? DEFAULT_STATE.width, 400);
    state.height = Math.max(state.height ?? DEFAULT_STATE.height, 300);

    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    const maximized = win.isMaximized();
    const bounds = maximized ? win.getNormalBounds() : win.getBounds();

    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized,
    };

    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[window-manager] Failed to save window state:", err);
  }
}

export function applyWindowState(win: BrowserWindow, state: WindowState): void {
  if (state.maximized) {
    win.maximize();
  }
}
