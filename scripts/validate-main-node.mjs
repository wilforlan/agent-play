#!/usr/bin/env node
/**
 * Verify that a main node id is registered and cryptographically consistent
 * with the platform genesis root key (same logic as POST /api/nodes/validate).
 *
 * Usage:
 *   node scripts/validate-main-node.mjs --node-id <hex>
 *   node scripts/validate-main-node.mjs dca198d353c7cb16ede6d7fdbc0f23464214dfc55d20f306f11202b9d929639b
 *
 * Environment:
 *   AGENT_PLAY_BASE_URL   API origin (default: http://127.0.0.1:3000)
 *   AGENT_PLAY_ROOT_FILE_PATH  Path to .root (optional; else ~/.agent-play/.root or ./.root)
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

function usage() {
  console.log(`Usage:
  node scripts/validate-main-node.mjs --node-id <64-char hex>
  node scripts/validate-main-node.mjs <node-id>

Environment:
  AGENT_PLAY_BASE_URL        Default: http://127.0.0.1:3000
  AGENT_PLAY_ROOT_FILE_PATH  Override path to genesis .root file
`);
}

function parseArgs(argv) {
  let nodeId = "";
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--node-id" && typeof argv[i + 1] === "string") {
      nodeId = argv[++i].trim();
    } else if (!a.startsWith("-") && nodeId.length === 0) {
      nodeId = a.trim();
    }
  }
  return { nodeId, help };
}

function resolveRootFilePath() {
  const fromEnv = process.env.AGENT_PLAY_ROOT_FILE_PATH;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return resolve(fromEnv.trim());
  }
  const homeRoot = join(homedir(), ".agent-play", ".root");
  if (existsSync(homeRoot)) return homeRoot;
  const cwdRoot = resolve(process.cwd(), ".root");
  if (existsSync(cwdRoot)) return cwdRoot;
  throw new Error(
    "Genesis root file not found. Set AGENT_PLAY_ROOT_FILE_PATH or place .root in ~/.agent-play/ or the current directory."
  );
}

function loadRootKey() {
  const path = resolveRootFilePath();
  return readFileSync(path, "utf8").trim().toLowerCase();
}

function normalizeBaseUrl(raw) {
  const s = raw.replace(/\/$/, "");
  return s.length > 0 ? s : "http://127.0.0.1:3000";
}

async function main() {
  const { nodeId, help } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (nodeId.length === 0) {
    console.error("Error: --node-id <id> or a single node id argument is required.\n");
    usage();
    process.exitCode = 1;
    return;
  }

  const rootKey = loadRootKey();
  const baseUrl = normalizeBaseUrl(
    process.env.AGENT_PLAY_BASE_URL ?? "https://agent-play.com"
  );
  const url = `${baseUrl}/api/nodes/validate`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nodeId, rootKey }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`Invalid JSON (${res.status}): ${text.slice(0, 500)}`);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(json, null, 2));

  if (typeof json === "object" && json !== null && json.ok === true) {
    process.exitCode = 0;
    return;
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
