import { BrowserWindow, session } from "electron";
import { getPlatform } from "./platforms";

export interface LoginResult {
  ok: boolean;
  credentials?: Record<string, string>;
  error?: string;
}

export async function openLoginWindow(
  platformId: string,
  parentWindow: BrowserWindow,
): Promise<LoginResult> {
  const platform = getPlatform(platformId);
  if (!platform) {
    return { ok: false, error: `Unknown platform: ${platformId}` };
  }

  const partition = `persist:freeclaw-${platformId}`;
  const ses = session.fromPartition(partition);

  return new Promise<LoginResult>((resolve) => {
    let resolved = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const loginWin = new BrowserWindow({
      width: 1000,
      height: 700,
      parent: parentWindow,
      modal: false,
      show: false,
      title: `Log in to ${platform.name}`,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    loginWin.once("ready-to-show", () => loginWin.show());

    function finish(result: LoginResult): void {
      if (resolved) {
        return;
      }
      resolved = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      if (!loginWin.isDestroyed()) {
        loginWin.close();
      }
      resolve(result);
    }

    loginWin.on("closed", () => {
      finish({ ok: false, error: "Login window closed by user" });
    });

    async function checkCookies(): Promise<void> {
      if (resolved) {
        return;
      }
      try {
        const allCookies: Electron.Cookie[] = [];
        for (const domain of platform.cookieDomains) {
          const cookies = await ses.cookies.get({ domain });
          allCookies.push(...cookies);
        }

        if (platform.detectLogin(allCookies)) {
          const userAgent = loginWin.webContents.getUserAgent();
          const credentials = platform.extractKey(allCookies, userAgent);
          finish({ ok: true, credentials });
        }
      } catch {
        // Ignore cookie read errors; keep polling.
      }
    }

    pollTimer = setInterval(() => void checkCookies(), 1500);

    void loginWin.loadURL(platform.loginUrl);
  });
}

export async function clearPlatformSession(platformId: string): Promise<void> {
  const partition = `persist:freeclaw-${platformId}`;
  const ses = session.fromPartition(partition);
  await ses.clearStorageData();
}
