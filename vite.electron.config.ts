import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

const external = ["electron", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

// Determine which entry to build based on ELECTRON_BUILD_TARGET env var.
// When not set, build main (default). Use the electron:build script to build both.
const target = process.env.ELECTRON_BUILD_TARGET ?? "main";

const entries: Record<string, Record<string, string>> = {
  main: { main: path.resolve(here, "electron/main/main.ts") },
  preload: { preload: path.resolve(here, "electron/preload/preload.ts") },
};

export default defineConfig({
  publicDir: false,
  build: {
    outDir: path.resolve(here, "dist/electron"),
    emptyOutDir: target === "main",
    sourcemap: true,
    lib: {
      entry: entries[target],
      formats: ["cjs"],
    },
    rollupOptions: {
      external,
      output: {
        entryFileNames: "[name].cjs",
      },
    },
    minify: false,
  },
  resolve: {
    alias: {
      "@electron": path.resolve(here, "electron"),
    },
  },
});
