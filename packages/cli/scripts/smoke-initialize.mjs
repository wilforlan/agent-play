import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function run() {
  const target = await mkdtemp(join(tmpdir(), "agent-play-cli-smoke-"));
  try {
    const result = spawnSync(
      "node",
      ["./dist/cli.js", "initialize", "--yes", "--dir", target, "--agent-count", "2"],
      {
        cwd: new URL("..", import.meta.url).pathname,
        encoding: "utf8",
      }
    );
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Smoke initialize command failed.");
    }
    const env = await readFile(join(target, ".env.example"), "utf8");
    if (!env.includes("AGENT_PLAY_AGENT_NODE_ID_2")) {
      throw new Error("Smoke test failed: scaffold missing second agent env var.");
    }
    console.log(`Smoke initialize OK: ${target}`);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
