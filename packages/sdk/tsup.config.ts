import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/browser.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "node20",
  external: [
    "@agent-play/node-tools",
    "@langchain/core",
    "@langchain/openai",
    "langchain",
    "node-fetch",
    "ws",
    "eventsource-client",
    "dotenv",
    "uuidv4",
  ],
});
