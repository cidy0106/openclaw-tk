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

test("gateway port is valid", async () => {
  const port = await evalFreeclaw<number>(page, "gateway.getPort()");
  expect(typeof port).toBe("number");
  expect(port).toBeGreaterThan(0);
  expect(port).toBeLessThan(65536);
});

test("gateway status is 'running'", async () => {
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

test("app version is a non-empty string", async () => {
  const version = await evalFreeclaw<string>(page, "app.getVersion()");
  expect(typeof version).toBe("string");
  expect(version.length).toBeGreaterThan(0);
});
