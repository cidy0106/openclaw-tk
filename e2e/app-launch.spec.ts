import { test, expect, type ElectronApplication, type Page } from "@playwright/test";
import { launchApp, closeApp, evalFreeclaw } from "./helpers";

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(app);
});

test("app window is visible", async () => {
  const visible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return win?.isVisible() ?? false;
  });
  expect(visible).toBe(true);
});

test("window has minimum dimensions (>= 800x600)", async () => {
  const { width, height } = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const [w, h] = win.getSize();
    return { width: w, height: h };
  });
  expect(width).toBeGreaterThanOrEqual(800);
  expect(height).toBeGreaterThanOrEqual(600);
});

test("window.freeclaw API is exposed in renderer", async () => {
  const apiType = await page.evaluate("typeof window.freeclaw");
  expect(apiType).toBe("object");
});

test("freeclaw.app.getVersion() returns a string", async () => {
  const version = await evalFreeclaw<string>(page, "app.getVersion()");
  expect(typeof version).toBe("string");
  expect(version.length).toBeGreaterThan(0);
});

test("freeclaw.gateway.getPort() returns a valid port number", async () => {
  const port = await evalFreeclaw<number>(page, "gateway.getPort()");
  expect(typeof port).toBe("number");
  expect(port).toBeGreaterThan(0);
  expect(port).toBeLessThan(65536);
});

test("freeclaw.gateway.status() returns 'running' within 30s", async () => {
  let status: string = "";
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    status = await evalFreeclaw<string>(page, "gateway.status()");
    if (status === "running") {
      break;
    }
    await page.waitForTimeout(1000);
  }

  expect(status).toBe("running");
});
