import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);
const source = join(workspaceRoot, ".root");
const destination = join(dirname(fileURLToPath(import.meta.url)), "..", ".root");

if (!existsSync(source)) {
  console.warn("copy-root: workspace .root not found; skipping");
  process.exit(0);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log("copy-root: .root -> packages/web-ui/.root");
