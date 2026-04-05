import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | undefined;

function resolveRootFilePath(): string {
  const envPath = process.env.AGENT_PLAY_ROOT_FILE;
  if (typeof envPath === "string" && envPath.length > 0) {
    return envPath;
  }
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 24; i += 1) {
    const candidate = join(dir, ".root");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    "player chain genesis: missing .root (set AGENT_PLAY_ROOT_FILE or add .root in the workspace root)"
  );
}

export function getPlayerChainGenesisSync(): string {
  if (cached !== undefined) {
    return cached;
  }
  const path = resolveRootFilePath();
  cached = readFileSync(path, "utf8").trim();
  return cached;
}
