#!/usr/bin/env node
import Redis from "ioredis";
import {
  hashNodePassword,
  deriveNodeIdFromPassword,
} from "../dist/index.js";

function parseArgs(argv) {
  const out = {
    rootKey: "",
    redisUrl: "",
    hostId: "default",
    nodeId: "",
    mainNodeId: "",
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
    } else if (a === "--root-key" && typeof argv[i + 1] === "string") {
      out.rootKey = argv[++i];
    } else if (a === "--node-id" && typeof argv[i + 1] === "string") {
      out.nodeId = argv[++i];
    } else if (a === "--redis-url" && typeof argv[i + 1] === "string") {
      out.redisUrl = argv[++i];
    } else if (a === "--host-id" && typeof argv[i + 1] === "string") {
      out.hostId = argv[++i];
    } else if (a === "--main-node-id" && typeof argv[i + 1] === "string") {
      out.mainNodeId = argv[++i];
    }
  }
  return out;
}

function usage() {
  return [
    "Validate whether a node id is a valid derivative",
    "under the provided root key and passphrase",
    "loaded from Redis using root-key scoped derivation.",
    "",
    "Usage:",
    "  node scripts/validate-node-derivative.mjs --root-key <hex> --node-id <id> --redis-url <url> [--host-id <id>] [--main-node-id <id>]",
    "",
    "Options:",
    "  --root-key           Root key used for derivation checks (required)",
    "  --redis-url          Redis URL to pull stored node hash (required)",
    "  --host-id            AGENT_PLAY_HOST_ID namespace (default: default)",
    "  --main-node-id       Parent main node id for scoped agent validation",
    "  --node-id            Node id to validate (direct mode)",
    "  --help, -h           Show this help",
  ].join("\n");
}

async function readStoredNodeCredentials(options) {
  const redis = new Redis(options.redisUrl);
  try {
    if (options.mainNodeId.length > 0) {
      const key = `agent-play:${options.hostId}:node:${options.mainNodeId}:auth:agent-node:${options.nodeId}`;
      const v = await redis.get(key);
      if (typeof v !== "string" || v.length === 0) {
        throw new Error("No stored agent credentials found under parent main node");
      }
      const parsed = JSON.parse(v);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.passw !== "string" ||
        parsed.passw.length === 0
      ) {
        throw new Error("Invalid agent credential record");
      }
      return {
        passw: parsed.passw,
        passwHash: parsed.passw,
        key,
        nodeKind: "agent",
      };
    }
    const mainAuthKey = `agent-play:${options.hostId}:node:${options.nodeId}:auth`;
    const mainKind = await redis.hget(mainAuthKey, "kind");
    if (mainKind === "root") {
      return { passw: "", passwHash: "", key: mainAuthKey, nodeKind: "root" };
    }
    const mainPasswHash = await redis.hget(mainAuthKey, "passwHash");
    const mainPassw = await redis.hget(mainAuthKey, "passw");
    if (
      typeof mainPasswHash === "string" &&
      mainPasswHash.length > 0 &&
      typeof mainPassw === "string" &&
      mainPassw.length > 0
    ) {
      return {
        passwHash: mainPasswHash,
        passw: mainPassw,
        key: mainAuthKey,
        nodeKind: "main",
      };
    }
    throw new Error("No stored main node credentials (passw/passwHash) found for node id");
  } finally {
    await redis.quit();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.rootKey.trim().length === 0) {
    throw new Error("--root-key is required");
  }
  if (args.redisUrl.trim().length === 0) {
    throw new Error("--redis-url is required");
  }
  const nodeId = args.nodeId.trim();
  if (nodeId.length === 0) {
    throw new Error("--node-id is required");
  }
  const rootKey = args.rootKey.trim().toLowerCase();
  const stored = await readStoredNodeCredentials({
    redisUrl: args.redisUrl.trim(),
    hostId: args.hostId.trim() || "default",
    nodeId,
    mainNodeId: args.mainNodeId.trim(),
  });
  if (stored.nodeKind === "root") {
    console.log(
      JSON.stringify(
        {
          ok: nodeId === rootKey,
          nodeId,
          nodeKind: "root",
          derivativeOk: nodeId === rootKey,
          hashOk: true,
          dataKey: stored.key,
        },
        null,
        2
      )
    );
    if (nodeId !== rootKey) {
      process.exitCode = 1;
    }
    return;
  }
  const derivativeOk =
    deriveNodeIdFromPassword({
      password: stored.passw,
      rootKey,
    }) === nodeId.trim().toLowerCase();
  const hashOk =
    stored.passwHash === stored.passw;

  const ok = derivativeOk && hashOk;
  console.log(
    JSON.stringify(
      {
        ok,
        nodeId,
        nodeKind: stored.nodeKind,
        derivativeOk,
        hashOk,
        dataKey: stored.key,
      },
      null,
      2
    )
  );
  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error("");
  console.error(usage());
  process.exitCode = 1;
});
