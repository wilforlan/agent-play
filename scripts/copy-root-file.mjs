#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
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

const copyReplacing = (from, to) => {
  try {
    if (existsSync(to)) {
      unlinkSync(to);
    }
    copyFileSync(from, to);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    if (code === "ETIMEDOUT") {
      console.warn(
        `copy-root debug: skip copy failure ${from} -> ${to} code=ETIMEDOUT ${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }
    throw error;
  }
};

const packageRoot = resolve(workspaceRoot, "packages", target);
const distDir = resolve(packageRoot, "dist");
mkdirSync(distDir, { recursive: true });
copyReplacing(sourceRootFile, resolve(distDir, ".root"));
copyReplacing(sourceRootFile, resolve(packageRoot, ".root"));
