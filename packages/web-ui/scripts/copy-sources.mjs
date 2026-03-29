import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const playSrc = join(root, "packages", "play-ui", "src");
const destVendor = join(root, "packages", "web-ui", "src", "canvas", "vendor");

mkdirSync(destVendor, { recursive: true });
cpSync(playSrc, destVendor, { recursive: true });
console.log("copy-sources: play-ui -> web-ui/src/canvas/vendor");
