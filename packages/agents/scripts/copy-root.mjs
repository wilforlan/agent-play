import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
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
try {
  if (existsSync(destination)) {
    unlinkSync(destination);
  }
  copyFileSync(source, destination);
  console.log("copy-root: .root -> packages/agents/.root");
} catch (error) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (code === "ETIMEDOUT") {
    console.warn(
      `copy-root debug: skip copy failure ${source} -> ${destination} code=ETIMEDOUT ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(0);
  }
  throw error;
}
