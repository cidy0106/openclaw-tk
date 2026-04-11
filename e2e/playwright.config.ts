import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 60_000,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
});
