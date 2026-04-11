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

interface PlatformEntry {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

test("freeclaw.platform.list() returns 13+ platforms", async () => {
  const platforms = await evalFreeclaw<PlatformEntry[]>(page, "platform.list()");
  expect(Array.isArray(platforms)).toBe(true);
  expect(platforms.length).toBeGreaterThanOrEqual(13);
});

test("each platform has id, name, and icon", async () => {
  const platforms = await evalFreeclaw<PlatformEntry[]>(page, "platform.list()");
  for (const p of platforms) {
    expect(typeof p.id).toBe("string");
    expect(p.id.length).toBeGreaterThan(0);
    expect(typeof p.name).toBe("string");
    expect(p.name.length).toBeGreaterThan(0);
    expect(typeof p.icon).toBe("string");
  }
});

test("freeclaw.platform.status() returns an object with status for each platform", async () => {
  const status = await evalFreeclaw<Record<string, { connected: boolean }>>(
    page,
    "platform.status()",
  );
  expect(typeof status).toBe("object");
  expect(status).not.toBeNull();

  const keys = Object.keys(status);
  expect(keys.length).toBeGreaterThanOrEqual(13);

  for (const key of keys) {
    expect(typeof status[key].connected).toBe("boolean");
  }
});

test("all expected platform IDs are present", async () => {
  const platforms = await evalFreeclaw<PlatformEntry[]>(page, "platform.list()");
  const ids = platforms.map((p) => p.id);

  const expectedIds = [
    "deepseek-web",
    "qwen-web",
    "claude-web",
    "chatgpt-web",
    "glm-web",
    "kimi-web",
    "gemini-web",
    "grok-web",
  ];

  for (const expectedId of expectedIds) {
    expect(ids).toContain(expectedId);
  }
});

test("platform status contains all expected platform IDs", async () => {
  const status = await evalFreeclaw<Record<string, { connected: boolean }>>(
    page,
    "platform.status()",
  );
  const expectedIds = [
    "deepseek-web",
    "qwen-web",
    "claude-web",
    "chatgpt-web",
    "glm-web",
    "kimi-web",
    "gemini-web",
    "grok-web",
  ];

  for (const expectedId of expectedIds) {
    expect(status).toHaveProperty(expectedId);
  }
});
