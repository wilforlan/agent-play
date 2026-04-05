import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const previewUiDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/agent-play/",
  build: {
    outDir: "dist",
  },
  root: ".",
  resolve: {
    alias: {
      "@agent-play/sdk": path.resolve(previewUiDir, "../sdk/src/index.ts"),
    },
  },
});
