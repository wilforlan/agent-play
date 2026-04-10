import { config } from "dotenv";
import { fileURLToPath } from "node:url";

/**
 * Loads **`packages/agents/.env`** relative to this module (works from **`src/`** and **`dist/`**).
 */
export function loadAgentsPackageEnv(): void {
  config({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
  });
}
