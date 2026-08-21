import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { copyLocalTree } from "./copy-local-tree.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const src = join(root, "docs");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "content", "docs");

if (!existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  console.warn("copy-docs: ../../docs not found; created empty content/docs");
  process.exit(0);
}

const startedAt = Date.now();
console.log("copy-docs: start docs -> content/docs");
const result = await copyLocalTree({
  src,
  dest,
  skipExtensions: [".html"],
  log: (message) => {
    console.warn(message);
  },
});
const elapsedMs = Date.now() - startedAt;
console.log(
  `copy-docs: docs -> content/docs copied=${result.copied} skipped=${result.skipped} failed=${result.failed} in ${elapsedMs}ms`
);
if (result.failed > 0) {
  console.warn(
    `copy-docs debug: skipped ${result.failed} file copy failure(s); in-app /doc still starts with local markdown`
  );
}
