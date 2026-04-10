#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (
  target !== "sdk" &&
  target !== "cli" &&
  target !== "node-tools" &&
  target !== "agents"
) {
  console.error(
    "Usage: node scripts/copy-root-file.mjs <sdk|cli|node-tools|agents>"
  );
  process.exit(1);
}

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const workspaceRoot = resolve(scriptDir, "..");
const sourceRootFile = resolve(workspaceRoot, ".root");
if (!existsSync(sourceRootFile)) {
  console.error(`missing root file: ${sourceRootFile}`);
  process.exit(1);
}

const packageRoot = resolve(workspaceRoot, "packages", target);
const distDir = resolve(packageRoot, "dist");
mkdirSync(distDir, { recursive: true });
copyFileSync(sourceRootFile, resolve(distDir, ".root"));
copyFileSync(sourceRootFile, resolve(packageRoot, ".root"));

