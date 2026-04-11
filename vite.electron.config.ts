import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

const external = ["electron", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  publicDir: false,
  build: {
    outDir: path.resolve(here, "dist/electron"),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        main: path.resolve(here, "electron/main/main.ts"),
        preload: path.resolve(here, "electron/preload/preload.ts"),
      },
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
