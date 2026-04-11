import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webUiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(webUiRoot, ".root");
const nextDir = join(webUiRoot, ".next");
const dest = join(nextDir, ".root");

if (!existsSync(source)) {
  console.warn("copy-root-to-next-output: .root not found; skipping");
  process.exit(0);
}
if (!existsSync(nextDir)) {
  console.error(
    "copy-root-to-next-output: .next missing; run next build first"
  );
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(source, dest);
console.log("copy-root-to-next-output: .root -> .next/.root");
