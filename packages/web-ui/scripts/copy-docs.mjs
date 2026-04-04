import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const src = join(root, "docs");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "content", "docs");

if (!existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  console.warn("copy-docs: ../../docs not found; created empty content/docs");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("copy-docs: docs -> content/docs");
