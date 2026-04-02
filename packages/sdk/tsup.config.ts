import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "node20",
  external: [
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
