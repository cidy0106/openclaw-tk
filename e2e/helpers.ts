import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const appPath = path.resolve(__dirname, "..", "dist", "electron", "main.cjs");
  const app = await electron.launch({
    args: [appPath],
    env: { ...process.env, NODE_ENV: "test", ELECTRON_IS_E2E: "1" },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  return { app, page };
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Evaluate a freeclaw API expression in the renderer.
 * Uses string-based evaluate to avoid lint issues with window type casts.
 */
export function evalFreeclaw<T = unknown>(page: Page, expr: string): Promise<T> {
  return page.evaluate(`window.freeclaw.${expr}`);
}
