import { loadAgentsPackageEnv } from "./load-agents-env.js";

loadAgentsPackageEnv();
if (
  process.env.OPENAI_API_KEY === undefined ||
  process.env.OPENAI_API_KEY.trim().length === 0
) {
  process.env.OPENAI_API_KEY = "vitest-placeholder-key";
}
