#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createNodeCredentialFromPassw,
  createNodeCredentialFromSecret,
  generateNodePassw,
  loadRootKey,
} from "@agent-play/node-tools";

type Credentials = {
  serverUrl: string;
  nodeId: string;
  passw: string;
  secretFilePath: string;
};

type BootstrapCliOpts = {
  secretFilePath?: string;
  rootFilePath?: string;
};

function credentialsPath(): string {
  return join(homedir(), ".agent-play", "credentials.json");
}

async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(credentialsPath(), "utf8");
    const json: unknown = JSON.parse(raw) as unknown;
    if (typeof json !== "object" || json === null) return null;
    const o = json as {
      serverUrl?: unknown;
      nodeId?: unknown;
      passw?: unknown;
      secretFilePath?: unknown;
    };
    if (
      typeof o.serverUrl !== "string" ||
      typeof o.nodeId !== "string" ||
      typeof o.passw !== "string" ||
      typeof o.secretFilePath !== "string"
    ) {
      return null;
    }
    return {
      serverUrl: o.serverUrl.replace(/\/$/, ""),
      nodeId: o.nodeId,
      passw: o.passw,
      secretFilePath: o.secretFilePath,
    };
  } catch {
    return null;
  }
}

async function saveCredentials(c: Credentials): Promise<void> {
  const dir = join(homedir(), ".agent-play");
  await mkdir(dir, { recursive: true });
  await writeFile(
    credentialsPath(),
    JSON.stringify(c, null, 2),
    "utf8"
  );
}

function defaultServerUrl(): string {
  return process.env.AGENT_PLAY_SERVER_URL ?? "http://127.0.0.1:3000";
}

function parseBootstrapNodeArgs(argv: string[]): BootstrapCliOpts {
  const out: BootstrapCliOpts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--secret-file" && typeof argv[i + 1] === "string") {
      out.secretFilePath = argv[++i];
    } else if (a === "--root-file" && typeof argv[i + 1] === "string") {
      out.rootFilePath = argv[++i];
    }
  }
  return out;
}

function resolveAgentPlayRootPath(options: BootstrapCliOpts): string {
  if (
    typeof options.rootFilePath === "string" &&
    options.rootFilePath.trim().length > 0
  ) {
    return resolve(options.rootFilePath.trim());
  }
  const fromEnv = process.env.AGENT_PLAY_ROOT_FILE_PATH;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return resolve(fromEnv.trim());
  }
  const homeRoot = join(homedir(), ".agent-play", ".root");
  if (existsSync(homeRoot)) {
    return homeRoot;
  }
  const cwdRoot = resolve(process.cwd(), ".root");
  if (existsSync(cwdRoot)) {
    return cwdRoot;
  }
  throw new Error(
    "Agent Play root key not found. Pass --root-file <path>, set AGENT_PLAY_ROOT_FILE_PATH, or place .root in ~/.agent-play/ or the project directory."
  );
}

async function registerNodeOnServer(
  serverUrl: string,
  passw: string,
  expectedNodeId: string
): Promise<void> {
  const res = await fetch(`${serverUrl}/api/nodes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passw }),
  });
  const text = await res.text();
  if (res.status === 409) {
    return;
  }
  if (!res.ok) {
    let msg = text;
    try {
      const err = JSON.parse(text) as { error?: unknown };
      if (typeof err.error === "string") {
        msg = err.error;
      }
    } catch {
      // keep raw text
    }
    throw new Error(
      `Node registration failed (${String(res.status)}): ${msg}`
    );
  }
  const json = JSON.parse(text) as { nodeId?: unknown };
  if (typeof json.nodeId !== "string") {
    throw new Error("Invalid response from server.");
  }
  if (json.nodeId !== expectedNodeId) {
    throw new Error(
      "Server node id does not match local derivation; check root file and server configuration."
    );
  }
}

async function cmdBootstrapNode(argv: string[]): Promise<void> {
  const opts = parseBootstrapNodeArgs(argv);
  const rl = createInterface({ input, output });
  const serverUrl = (
    (await rl.question(
      `Server URL [${defaultServerUrl()}]: `
    )).trim() || defaultServerUrl()
  ).replace(/\/$/, "");
  rl.close();

  const rootPath = resolveAgentPlayRootPath(opts);
  const rootKey = loadRootKey(rootPath);

  const dir = join(homedir(), ".agent-play");
  await mkdir(dir, { recursive: true });

  let credential: { nodeId: string; passw: string };
  let secretFilePath: string;

  if (typeof opts.secretFilePath === "string" && opts.secretFilePath.length > 0) {
    secretFilePath = resolve(opts.secretFilePath.trim());
    const secretMaterial = await readFile(secretFilePath);
    credential = createNodeCredentialFromSecret({
      secretMaterial,
      rootKey,
    });
  } else {
    const passw = generateNodePassw();
    credential = createNodeCredentialFromPassw({ passw, rootKey });
    secretFilePath = join(dir, `.${credential.nodeId.slice(0, 12)}`);
    await writeFile(secretFilePath, `${credential.passw}\n`, "utf8");
  }

  await registerNodeOnServer(serverUrl, credential.passw, credential.nodeId);

  await saveCredentials({
    serverUrl,
    nodeId: credential.nodeId,
    passw: credential.passw,
    secretFilePath,
  });

  console.log(`nodeId: ${credential.nodeId}`);
  console.log(`passw: ${credential.passw}`);
  console.log(`secretFilePath: ${secretFilePath}`);
  console.log("Keep this material safe. Losing it means losing access.");
}

async function cmdClearNodeCredentials(): Promise<void> {
  try {
    await unlink(credentialsPath());
    console.log("Credentials removed.");
  } catch {
    console.log("No saved credentials.");
  }
}

function printAgentPlayIntegrationGuide(): void {
  console.log("");
  console.log("How your agent appears on the play world");
  console.log("────────────────────────────────────────────");
  console.log("  • Use node credentials with RemotePlayWorld secretFilePath.");
  console.log(
    "  • LangChain: use langchainRegistration(agent) and pass agent.toolNames to addPlayer."
  );
  console.log(
    '  • The tool contract requires a tool named "chat_tool" in that list (add it if missing).'
  );
  console.log(
    "  • Structures on the map are derived from those tool names — keep them aligned with your real tools."
  );
  console.log(
    "  • RemotePlayWorld({ secretFilePath }) and addPlayer({ ..., mainNodeId, agentId })."
  );
  console.log("");
}

async function cmdCreate(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play bootstrap-node` first.");
    process.exitCode = 1;
    return;
  }
  const rl = createInterface({ input, output });
  const name = (await rl.question("Agent name: ")).trim() || "agent";
  rl.close();

  const res = await fetch(`${cred.serverUrl}/api/agents`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-node-id": cred.nodeId,
      "x-node-passw": cred.passw,
    },
    body: JSON.stringify({ name }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const err = JSON.parse(text) as { error?: unknown };
      if (typeof err.error === "string") msg = err.error;
    } catch {
      // keep raw text
    }
    console.error(`Create failed (${res.status}): ${msg}`);
    process.exitCode = 1;
    return;
  }
  const json = JSON.parse(text) as { agentId?: unknown };
  if (typeof json.agentId !== "string") {
    console.error("Invalid response from server.");
    process.exitCode = 1;
    return;
  }
  printAgentPlayIntegrationGuide();
  console.log(`Created agent id: ${json.agentId}`);
  console.log("");
}

async function cmdDelete(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play bootstrap-node` first.");
    process.exitCode = 1;
    return;
  }
  const listRes = await fetch(`${cred.serverUrl}/api/agents`, {
    headers: { "x-node-id": cred.nodeId, "x-node-passw": cred.passw },
  });
  const listText = await listRes.text();
  if (!listRes.ok) {
    console.error(`List failed (${listRes.status}): ${listText}`);
    process.exitCode = 1;
    return;
  }
  const listJson = JSON.parse(listText) as { agents?: unknown };
  const agentsRaw = listJson.agents;
  if (!Array.isArray(agentsRaw)) {
    console.error("Invalid list response.");
    process.exitCode = 1;
    return;
  }
  type Row = { agentId: string; name: string };
  const agents: Row[] = [];
  for (const a of agentsRaw) {
    if (typeof a !== "object" || a === null) continue;
    const o = a as { agentId?: unknown; name?: unknown };
    if (typeof o.agentId === "string" && typeof o.name === "string") {
      agents.push({ agentId: o.agentId, name: o.name });
    }
  }
  if (agents.length === 0) {
    console.log("No agents.");
    return;
  }
  agents.forEach((a, i) => {
    console.log(`${i + 1}. ${a.agentId} (${a.name})`);
  });
  const rl = createInterface({ input, output });
  const pick = (await rl.question("Agent id to delete (empty = cancel): "))
    .trim();
  rl.close();
  if (pick.length === 0) {
    console.log("Cancelled.");
    return;
  }
  const delRes = await fetch(
    `${cred.serverUrl}/api/agents?id=${encodeURIComponent(pick)}`,
    {
      method: "DELETE",
      headers: { "x-node-id": cred.nodeId, "x-node-passw": cred.passw },
    }
  );
  const delText = await delRes.text();
  if (!delRes.ok) {
    console.error(`Delete failed (${delRes.status}): ${delText}`);
    process.exitCode = 1;
    return;
  }
  const delJson = JSON.parse(delText) as { ok?: unknown };
  console.log(delJson.ok === true ? "Deleted." : "Not found.");
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "bootstrap-node") {
    await cmdBootstrapNode(process.argv.slice(3));
    return;
  }
  if (cmd === "clear-node-credentials") {
    await cmdClearNodeCredentials();
    return;
  }
  if (cmd === "create") {
    await cmdCreate();
    return;
  }
  if (cmd === "delete" || cmd === "remove") {
    await cmdDelete();
    return;
  }
  console.error(
    "Usage: agent-play bootstrap-node [--secret-file <path>] [--root-file <path>] | clear-node-credentials | create | delete"
  );
  process.exitCode = 1;
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
