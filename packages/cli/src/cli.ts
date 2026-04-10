#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  type AgentPlayCredentialsFile,
  createNodeCredentialFromPassw,
  deriveNodeIdFromPassword,
  generateNodePassw,
  hashNodePassword,
  loadAgentPlayCredentialsFileFromPath,
  loadRootKey,
} from "@agent-play/node-tools";

type BootstrapCliOpts = {
  rootFilePath?: string;
};

type AgentRow = { agentId: string; name: string };
type AgentNodeCredential = {
  nodeId: string;
  passw: string;
  createdAt: string;
};

type ValidateAgentNodeOpts =
  | { mode: "all" }
  | { mode: "ids"; agentNodeIds: string[] };

function nodeAuthHeaders(cred: AgentPlayCredentialsFile): Record<string, string> {
  return {
    "x-node-id": cred.nodeId,
    "x-node-passw": hashNodePassword(cred.passw),
  };
}

function parseAgentRows(agentsRaw: unknown): AgentRow[] {
  if (!Array.isArray(agentsRaw)) {
    return [];
  }
  const agents: AgentRow[] = [];
  for (const a of agentsRaw) {
    if (typeof a !== "object" || a === null) continue;
    const o = a as { agentId?: unknown; name?: unknown };
    if (typeof o.agentId === "string" && typeof o.name === "string") {
      agents.push({ agentId: o.agentId, name: o.name });
    }
  }
  return agents;
}

function credentialsPath(): string {
  return join(homedir(), ".agent-play", "credentials.json");
}

async function loadCredentials(): Promise<AgentPlayCredentialsFile | null> {
  return loadAgentPlayCredentialsFileFromPath(credentialsPath());
}

async function saveCredentials(c: AgentPlayCredentialsFile): Promise<void> {
  const dir = join(homedir(), ".agent-play");
  await mkdir(dir, { recursive: true });
  await writeFile(
    credentialsPath(),
    JSON.stringify(c, null, 2),
    "utf8"
  );
}

const BOOTSTRAP_ENVIRONMENTS = [
  { id: "local-server", url: "http://127.0.0.1:3000" },
  { id: "test-server", url: "https://test-agent-play.com" },
  { id: "main-server", url: "https://agent-play.com" },
] as const;

function parseBootstrapEnvironmentAnswer(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (t === "" || t === "1") {
    return BOOTSTRAP_ENVIRONMENTS[0].url;
  }
  if (t === "2") {
    return BOOTSTRAP_ENVIRONMENTS[1].url;
  }
  if (t === "3") {
    return BOOTSTRAP_ENVIRONMENTS[2].url;
  }
  for (const e of BOOTSTRAP_ENVIRONMENTS) {
    if (t === e.id) {
      return e.url;
    }
  }
  if (t === "local") {
    return BOOTSTRAP_ENVIRONMENTS[0].url;
  }
  if (t === "test") {
    return BOOTSTRAP_ENVIRONMENTS[1].url;
  }
  if (t === "main") {
    return BOOTSTRAP_ENVIRONMENTS[2].url;
  }
  return null;
}

async function promptBootstrapEnvironment(
  rl: ReturnType<typeof createInterface>
): Promise<string> {
  const lines = [
    "Choose environment (sets server URL):",
    `  1) ${BOOTSTRAP_ENVIRONMENTS[0].id}  → ${BOOTSTRAP_ENVIRONMENTS[0].url}`,
    `  2) ${BOOTSTRAP_ENVIRONMENTS[1].id}   → ${BOOTSTRAP_ENVIRONMENTS[1].url}`,
    `  3) ${BOOTSTRAP_ENVIRONMENTS[2].id}   → ${BOOTSTRAP_ENVIRONMENTS[2].url}`,
    "Enter 1–3, or local-server / test-server / main-server [1]: ",
  ].join("\n");
  for (;;) {
    const answer = await rl.question(lines);
    const url = parseBootstrapEnvironmentAnswer(answer);
    if (url !== null) {
      return url.replace(/\/$/, "");
    }
    console.log(
      "Invalid choice. Enter 1, 2, or 3, or one of: local-server, test-server, main-server."
    );
  }
}

function parseBootstrapNodeArgs(argv: string[]): BootstrapCliOpts {
  const out: BootstrapCliOpts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root-file" && typeof argv[i + 1] === "string") {
      out.rootFilePath = argv[++i];
    }
  }
  return out;
}

function parseValidateAgentNodeArgs(argv: string[]): ValidateAgentNodeOpts | null {
  let wantsAll = false;
  let ids: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") {
      wantsAll = true;
      continue;
    }
    if (a === "--agent-node-ids" && typeof argv[i + 1] === "string") {
      const raw = argv[++i].trim();
      ids = raw
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      continue;
    }
    return null;
  }
  if (wantsAll) {
    return { mode: "all" };
  }
  if (ids.length > 0) {
    return { mode: "ids", agentNodeIds: ids };
  }
  return null;
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
    body: JSON.stringify({ kind: "main", passw }),
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
    console.log("json", json);
    console.log("expectedNodeId", expectedNodeId);

    throw new Error(
      "Server node id does not match local derivation; check root file and server configuration."
    );
  }
}

async function cmdBootstrapNode(argv: string[]): Promise<void> {
  const opts = parseBootstrapNodeArgs(argv);
  const rl = createInterface({ input, output });
  const serverUrl = await promptBootstrapEnvironment(rl);
  rl.close();
  console.log(`Using server: ${serverUrl}`);

  const rootPath = resolveAgentPlayRootPath(opts);
  const rootKey = loadRootKey(rootPath);

  const dir = join(homedir(), ".agent-play");
  await mkdir(dir, { recursive: true });

  const generatedPassw = generateNodePassw();
  const hashedPassw = hashNodePassword(generatedPassw);
  const credential = createNodeCredentialFromPassw({ passw: hashedPassw, rootKey });

  await registerNodeOnServer(serverUrl, hashedPassw, credential.nodeId);

  await saveCredentials({
    serverUrl,
    nodeId: credential.nodeId,
    passw: generatedPassw,
  });

  console.log(
    `genesisNodeId (platform root key from .root; all main nodes derive under this): ${rootKey}`
  );
  console.log(`mainNodeId (your developer node): ${credential.nodeId}`);
  console.log(`passw: ${generatedPassw}`);
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
  console.log(
    "  • Use ~/.agent-play/credentials.json + .root with RemotePlayWorld({ nodeCredentials })."
  );
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
    "  • RemotePlayWorld({ nodeCredentials: { rootKey, passw } }) and addAgent({ nodeId, ... })."
  );
  console.log("");
}

async function cmdCreateAgentNode(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  const rootKey = loadRootKey(resolveAgentPlayRootPath({}));
  const agentPassw = generateNodePassw();
  const hashedAgentPassw = hashNodePassword(agentPassw);
  const agentNodeId = deriveNodeIdFromPassword({
    password: hashedAgentPassw,
    rootKey,
  });
  const res = await fetch(`${cred.serverUrl}/api/nodes/agent-node`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...nodeAuthHeaders(cred),
    },
    body: JSON.stringify({
      kind: "agent",
      parentNodeId: cred.nodeId,
      agentNodeId,
      agentNodePassw: hashedAgentPassw,
    }),
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
  if (json.agentId !== agentNodeId) {
    console.error(
      "Server returned a different agent node id than the locally derived one."
    );
    process.exitCode = 1;
    return;
  }
  const nextAgentNodes: AgentNodeCredential[] = [
    ...(cred.agentNodes ?? []).filter((n) => n.nodeId !== agentNodeId),
    {
      nodeId: agentNodeId,
      passw: agentPassw,
      createdAt: new Date().toISOString(),
    },
  ];
  await saveCredentials({
    ...cred,
    agentNodes: nextAgentNodes,
  });
  printAgentPlayIntegrationGuide();
  console.log(`Created agent node id: ${json.agentId}`);
  console.log(`Agent node passw: ${agentPassw}`);
  console.log(
    `Saved agent node credentials to ${credentialsPath()} (agentNodes).`
  );
  console.log("Keep this material safe. Losing it means losing access.");
  console.log("");
}

async function cmdInspectNode(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  const res = await fetch(`${cred.serverUrl}/api/nodes`, {
    headers: nodeAuthHeaders(cred),
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
    console.error(`Inspect failed (${res.status}): ${msg}`);
    process.exitCode = 1;
    return;
  }
  const json = JSON.parse(text) as {
    genesisNodeId?: unknown;
    mainNode?: unknown;
    agentNodes?: unknown;
  };
  if (typeof json.genesisNodeId !== "string") {
    console.error("Invalid inspect response.");
    process.exitCode = 1;
    return;
  }
  const main = json.mainNode;
  if (typeof main !== "object" || main === null) {
    console.error("Invalid inspect response.");
    process.exitCode = 1;
    return;
  }
  const mn = main as {
    nodeId?: unknown;
    createdAt?: unknown;
    agentNodeIds?: unknown;
  };
  if (typeof mn.nodeId !== "string" || typeof mn.createdAt !== "string") {
    console.error("Invalid inspect response.");
    process.exitCode = 1;
    return;
  }
  const agentNodeIdsFromMain = Array.isArray(mn.agentNodeIds)
    ? mn.agentNodeIds.filter((x): x is string => typeof x === "string")
    : [];
  const runtimeAgents = parseAgentRows(json.agentNodes);
  console.log("Platform genesis node id (from server .root / root key):");
  console.log(`  ${json.genesisNodeId}`);
  console.log("");
  console.log("Your main developer node:");
  console.log(`  nodeId:    ${mn.nodeId}`);
  console.log(`  createdAt: ${mn.createdAt}`);
  console.log("");
  console.log(
    `Agent node identities (create-agent-node) (${String(agentNodeIdsFromMain.length)}):`
  );
  if (agentNodeIdsFromMain.length === 0) {
    console.log("  (none)");
  } else {
    agentNodeIdsFromMain.forEach((id, i) => {
      console.log(`  ${String(i + 1)}. ${id}`);
    });
  }
  console.log("");
  console.log(
    `Runtime agents — SDK metadata (${String(runtimeAgents.length)}):`
  );
  if (runtimeAgents.length === 0) {
    console.log("  (none)");
  } else {
    runtimeAgents.forEach((a, i) => {
      console.log(`  ${String(i + 1)}. ${a.agentId} — ${a.name}`);
    });
  }
  console.log("");
}

async function cmdListAgentNodes(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  const listRes = await fetch(`${cred.serverUrl}/api/agents`, {
    headers: nodeAuthHeaders(cred),
  });
  const listText = await listRes.text();
  if (!listRes.ok) {
    console.error(`List failed (${listRes.status}): ${listText}`);
    process.exitCode = 1;
    return;
  }
  const listJson = JSON.parse(listText) as { agents?: unknown };
  const agents = parseAgentRows(listJson.agents);
  if (agents.length === 0) {
    console.log("No agent nodes.");
    return;
  }
  agents.forEach((a, i) => {
    console.log(`${String(i + 1)}. ${a.agentId} (${a.name})`);
  });
}

async function cmdDeleteAgentNode(argv: string[]): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  let pick = argv[0]?.trim() ?? "";
  if (pick.length === 0) {
    const listRes = await fetch(`${cred.serverUrl}/api/agents`, {
      headers: nodeAuthHeaders(cred),
    });
    const listText = await listRes.text();
    if (!listRes.ok) {
      console.error(`List failed (${listRes.status}): ${listText}`);
      process.exitCode = 1;
      return;
    }
    const listJson = JSON.parse(listText) as { agents?: unknown };
    const agents = parseAgentRows(listJson.agents);
    if (agents.length === 0) {
      console.log("No agents.");
      return;
    }
    agents.forEach((a, i) => {
      console.log(`${i + 1}. ${a.agentId} (${a.name})`);
    });
    const rl = createInterface({ input, output });
    pick = (await rl.question("Agent id to delete (empty = cancel): ")).trim();
    rl.close();
  }
  if (pick.length === 0) {
    console.log("Cancelled.");
    return;
  }
  const delRes = await fetch(
    `${cred.serverUrl}/api/agents?id=${encodeURIComponent(pick)}`,
    {
      method: "DELETE",
      headers: nodeAuthHeaders(cred),
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

async function cmdDeleteMainNode(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  console.error("");
  console.error("WARNING: You are about to delete your main developer node.");
  console.error(
    "The server will remove this node and cascade-delete every registered"
  );
  console.error(
    "agent node (SDK agent registration) that belongs to it. This cannot be undone."
  );
  console.error(
    "You will need a new passphrase and secret file to join the platform again."
  );
  console.error("");
  const rl = createInterface({ input, output });
  const typed = (
    await rl.question(
      `Type your main node id exactly to confirm (${cred.nodeId}): `
    )
  ).trim();
  rl.close();
  if (typed !== cred.nodeId) {
    console.log("Confirmation did not match. Cancelled.");
    return;
  }
  const res = await fetch(`${cred.serverUrl}/api/nodes`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...nodeAuthHeaders(cred),
    },
    body: JSON.stringify({ confirmNodeId: cred.nodeId }),
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
    console.error(`Delete main node failed (${res.status}): ${msg}`);
    process.exitCode = 1;
    return;
  }
  const json = JSON.parse(text) as {
    ok?: unknown;
    deletedAgentCount?: unknown;
  };
  if (json.ok !== true) {
    console.error("Unexpected response from server.");
    process.exitCode = 1;
    return;
  }
  const n =
    typeof json.deletedAgentCount === "number" ? json.deletedAgentCount : 0;
  console.log(
    `Main node removed. Cascaded agent nodes deleted: ${String(n)}.`
  );
  console.log("Run `agent-play clear-node-credentials` to forget local creds.");
}

async function validateNodeIdentityOnServer(options: {
  cred: AgentPlayCredentialsFile;
  rootKey: string;
  nodeId: string;
  mainNodeId?: string;
}): Promise<{ ok: boolean; reason?: string; nodeKind?: string }> {
  const res = await fetch(`${options.cred.serverUrl}/api/nodes/validate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...nodeAuthHeaders(options.cred),
    },
    body: JSON.stringify({
      nodeId: options.nodeId,
      rootKey: options.rootKey,
      mainNodeId: options.mainNodeId,
    }),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Validate failed (${String(res.status)}): ${text}`);
  }
  if (typeof json !== "object" || json === null) {
    throw new Error(`Validate failed (${String(res.status)}): invalid response`);
  }
  const obj = json as { ok?: unknown; reason?: unknown; nodeKind?: unknown; error?: unknown };
  if (typeof obj.ok !== "boolean") {
    const err = typeof obj.error === "string" ? obj.error : text;
    throw new Error(`Validate failed (${String(res.status)}): ${err}`);
  }
  return {
    ok: obj.ok,
    reason: typeof obj.reason === "string" ? obj.reason : undefined,
    nodeKind: typeof obj.nodeKind === "string" ? obj.nodeKind : undefined,
  };
}

async function cmdValidateMainNode(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  const rootKey = loadRootKey(resolveAgentPlayRootPath({}));
  const result = await validateNodeIdentityOnServer({
    cred,
    rootKey,
    nodeId: cred.nodeId,
  });
  if (!result.ok) {
    console.error(
      `Main node validation failed: ${result.reason ?? "unknown reason"}`
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Main node validation passed: ${cred.nodeId}`);
}

async function cmdValidateAgentNode(argv: string[]): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error(
      "Run `agent-play create-main-node` (or `bootstrap-node`) first."
    );
    process.exitCode = 1;
    return;
  }
  const opts = parseValidateAgentNodeArgs(argv);
  if (opts === null) {
    console.error(
      "Usage: agent-play validate-agent-node --all | --agent-node-ids <id1,id2,...>"
    );
    process.exitCode = 1;
    return;
  }
  const rootKey = loadRootKey(resolveAgentPlayRootPath({}));
  const targetIds =
    opts.mode === "all"
      ? (cred.agentNodes ?? []).map((n) => n.nodeId)
      : opts.agentNodeIds;
  const dedupedIds = Array.from(new Set(targetIds.filter((id) => id.length > 0)));
  if (dedupedIds.length === 0) {
    console.log("No agent node ids to validate.");
    return;
  }
  let failures = 0;
  for (const nodeId of dedupedIds) {
    const result = await validateNodeIdentityOnServer({
      cred,
      rootKey,
      nodeId,
      mainNodeId: cred.nodeId,
    });
    if (!result.ok) {
      failures += 1;
      console.error(
        `FAIL ${nodeId}: ${result.reason ?? "unknown reason"}`
      );
      continue;
    }
    console.log(`PASS ${nodeId}`);
  }
  if (failures > 0) {
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${String(dedupedIds.length)} agent node(s) successfully.`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "bootstrap-node" || cmd === "create-main-node") {
    await cmdBootstrapNode(process.argv.slice(3));
    return;
  }
  if (cmd === "clear-node-credentials") {
    await cmdClearNodeCredentials();
    return;
  }
  if (cmd === "inspect-node") {
    await cmdInspectNode();
    return;
  }
  if (cmd === "create-agent-node" || cmd === "create") {
    await cmdCreateAgentNode();
    return;
  }
  if (cmd === "list-agent-nodes" || cmd === "list") {
    await cmdListAgentNodes();
    return;
  }
  if (cmd === "delete-agent-node" || cmd === "delete" || cmd === "remove") {
    await cmdDeleteAgentNode(process.argv.slice(3));
    return;
  }
  if (cmd === "delete-main-node") {
    await cmdDeleteMainNode();
    return;
  }
  if (cmd === "validate-main-node") {
    await cmdValidateMainNode();
    return;
  }
  if (cmd === "validate-agent-node") {
    await cmdValidateAgentNode(process.argv.slice(3));
    return;
  }
  console.error(
    [
      "Usage:",
      "  agent-play create-main-node | bootstrap-node [--root-file <path>]",
      "  agent-play inspect-node",
      "  agent-play create-agent-node | create",
      "  agent-play list-agent-nodes | list",
      "  agent-play delete-agent-node | delete [agent-id]",
      "  agent-play delete-main-node",
      "  agent-play validate-main-node",
      "  agent-play validate-agent-node --all",
      "  agent-play validate-agent-node --agent-node-ids <id1,id2,...>",
      "  agent-play clear-node-credentials",
    ].join("\n")
  );
  process.exitCode = 1;
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
