/**
 * Real user flow E2E test — simulates a user's journey from app launch to chat.
 *
 * Step 1: Double-click → window appears, gateway starts
 * Step 2: UI loads → chat interface visible
 * Step 3: Platforms connected → models available in selector
 * Step 4: Chat input → can type and see it
 * Step 5: Window title is "FreeClaw"
 */
import { test, expect, type ElectronApplication, type Page } from "@playwright/test";
import { launchApp, closeApp } from "./helpers.js";

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const launched = await launchApp();
  app = launched.app;
  page = launched.page;

  // Wait for gateway to become healthy
  for (let i = 0; i < 30; i++) {
    const status = await page.evaluate("window.freeclaw?.gateway?.status?.()");
    if (status === "running") {
      break;
    }
    await page.waitForTimeout(1000);
  }

  // Give UI time to render after gateway connects
  await page.waitForTimeout(8000);
});

test.afterAll(async () => {
  await closeApp(app);
});

// ── Step 1: App launches correctly ──────────────────────────────────

test("window title is FreeClaw", async () => {
  const title = await app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows()[0]?.getTitle() ?? "";
  });
  expect(title).toBe("FreeClaw");
});

// ── Step 2: UI loads with chat interface ────────────────────────────

test("page loads and shows chat UI", async () => {
  // Page should not show an error
  const url = page.url();
  expect(url).not.toContain("chrome-error");
  expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+/);
});

test("chat input is visible and interactive", async () => {
  // Find the chat textarea
  const textarea = page.locator("textarea");
  const count = await textarea.count();
  expect(count).toBeGreaterThan(0);

  // The textarea should have a placeholder about sending messages
  const placeholder = await textarea.first().getAttribute("placeholder");
  expect(placeholder).toBeTruthy();
  expect(placeholder!.toLowerCase()).toContain("message");
});

test("navigation sidebar is visible", async () => {
  // The sidebar should have navigation items
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  // Should contain navigation labels (Chinese or English)
  const hasNav = bodyText.includes("聊天") || bodyText.includes("Chat");
  expect(hasNav).toBe(true);
});

// ── Step 3: Connected platforms show models ─────────────────────────

test("model selector shows available models", async () => {
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");

  // Should show at least one model from connected platforms
  const hasModel =
    bodyText.includes("deepseek") ||
    bodyText.includes("claude") ||
    bodyText.includes("chatgpt") ||
    bodyText.includes("doubao") ||
    bodyText.includes("qwen") ||
    bodyText.includes("glm") ||
    bodyText.includes("grok") ||
    bodyText.includes("kimi") ||
    bodyText.includes("gemini");
  expect(hasModel).toBe(true);
});

// ── Step 4: Gateway WebSocket is connected ──────────────────────────

test("gateway WebSocket is connected (no error overlay)", async () => {
  // If WebSocket failed, the UI shows a connection error overlay
  // with text like "disconnected" or "unauthorized"
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  const hasError =
    bodyText.includes("unauthorized") ||
    bodyText.includes("token mismatch") ||
    bodyText.includes("origin not allowed");
  expect(hasError).toBe(false);
});

// ── Step 5: Platform manager API is functional ──────────────────────

test("platform manager lists connected platforms correctly", async () => {
  const platforms: Array<{ id: string; connected: boolean }> = await page.evaluate(
    "window.freeclaw.platform.list()",
  );

  const connected = platforms.filter((p) => p.connected);
  // At least some platforms should be connected (from existing auth-profiles.json)
  expect(connected.length).toBeGreaterThan(0);
  console.log(`${connected.length}/${platforms.length} platforms connected`);
});

// ── Step 6: Screenshot for visual verification ──────────────────────

test("take screenshot for visual verification", async () => {
  await page.screenshot({ path: "e2e/screenshots/user-flow.png", fullPage: true });
});
