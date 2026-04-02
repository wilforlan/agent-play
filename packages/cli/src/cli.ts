#!/usr/bin/env node
/**
 * @packageDocumentation
 * **agent-play** CLI: authenticate against the web UI, manage API keys and registered agents.
 * Commands: `login`, `logout`, `create-key`, `view-keys`, `create`, `delete`.
 * Default server URL comes from `AGENT_PLAY_SERVER_URL` or `http://127.0.0.1:3000`.
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/** Stored session after `login`: web UI origin and bearer token. */
type Credentials = {
  serverUrl: string;
  token: string;
};

/**
 * @returns Absolute path to `~/.agent-play/credentials.json`.
 * @remarks **Callers:** {@link loadCredentials}, {@link saveCredentials}, {@link cmdLogout}. **Callees:** `path.join`, `homedir`.
 */
function credentialsPath(): string {
  return join(homedir(), ".agent-play", "credentials.json");
}

/**
 * Reads saved credentials, or `null` if missing or invalid.
 * @remarks **Callers:** `cmdCreateKey`, `cmdViewKeys`, `cmdCreate`, `cmdDelete`. **Callees:** `readFile`, `JSON.parse`.
 */
async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(credentialsPath(), "utf8");
    const json: unknown = JSON.parse(raw) as unknown;
    if (typeof json !== "object" || json === null) return null;
    const o = json as { serverUrl?: unknown; token?: unknown };
    if (typeof o.serverUrl !== "string" || typeof o.token !== "string") {
      return null;
    }
    return { serverUrl: o.serverUrl.replace(/\/$/, ""), token: o.token };
  } catch {
    return null;
  }
}

/**
 * Persists credentials to disk (creates `~/.agent-play` if needed).
 * @remarks **Callers:** {@link cmdLogin}. **Callees:** `mkdir`, `writeFile`.
 */
async function saveCredentials(c: Credentials): Promise<void> {
  const dir = join(homedir(), ".agent-play");
  await mkdir(dir, { recursive: true });
  await writeFile(
    credentialsPath(),
    JSON.stringify({ serverUrl: c.serverUrl, token: c.token }, null, 2),
    "utf8"
  );
}

/**
 * @returns `AGENT_PLAY_SERVER_URL` or `http://127.0.0.1:3000`.
 * @remarks **Callers:** {@link cmdLogin} prompt default.
 */
function defaultServerUrl(): string {
  return process.env.AGENT_PLAY_SERVER_URL ?? "http://127.0.0.1:3000";
}

/**
 * Interactive sign-up or sign-in; writes {@link Credentials} via {@link saveCredentials}.
 * @remarks **Callers:** {@link main} when argv is `login`. **Callees:** `fetch` to `/api/auth/lookup`, `/login`, `/register`.
 */
async function cmdLogin(): Promise<void> {
  const rl = createInterface({ input, output });
  const serverUrl = (
    (await rl.question(
      `Server URL [${defaultServerUrl()}]: `
    )).trim() || defaultServerUrl()
  ).replace(/\/$/, "");
  const email = (await rl.question("Email: ")).trim();
  if (email.length === 0) {
    rl.close();
    console.error("Email is required.");
    process.exitCode = 1;
    return;
  }
  const lookupRes = await fetch(`${serverUrl}/api/auth/lookup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const lookupText = await lookupRes.text();
  if (!lookupRes.ok) {
    rl.close();
    console.error(`Lookup failed (${lookupRes.status}): ${lookupText}`);
    process.exitCode = 1;
    return;
  }
  let lookupJson: unknown;
  try {
    lookupJson = JSON.parse(lookupText) as unknown;
  } catch {
    rl.close();
    console.error("Invalid JSON from server.");
    process.exitCode = 1;
    return;
  }
  const exists =
    typeof lookupJson === "object" &&
    lookupJson !== null &&
    (lookupJson as { exists?: unknown }).exists === true;

  let token: string | undefined;
  if (exists) {
    const password = (await rl.question("Password: ")).trim();
    rl.close();
    const loginRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginText = await loginRes.text();
    if (!loginRes.ok) {
      console.error(`Login failed (${loginRes.status}): ${loginText}`);
      process.exitCode = 1;
      return;
    }
    const loginJson = JSON.parse(loginText) as { token?: unknown };
    if (typeof loginJson.token !== "string") {
      console.error("Missing token in response.");
      process.exitCode = 1;
      return;
    }
    token = loginJson.token;
  } else {
    const name = (await rl.question("Your name: ")).trim() || "User";
    const password = (await rl.question("Choose a password (min 8 chars): ")).trim();
    if (password.length < 8) {
      rl.close();
      console.error("Password must be at least 8 characters.");
      process.exitCode = 1;
      return;
    }
    rl.close();
    const regRes = await fetch(`${serverUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    const regText = await regRes.text();
    if (!regRes.ok) {
      console.error(`Sign up failed (${regRes.status}): ${regText}`);
      process.exitCode = 1;
      return;
    }
    const regJson = JSON.parse(regText) as { token?: unknown };
    if (typeof regJson.token !== "string") {
      console.error("Missing token in response.");
      process.exitCode = 1;
      return;
    }
    token = regJson.token;
  }

  await saveCredentials({ serverUrl, token });
  console.log(`Signed in. Credentials saved to ${credentialsPath()}`);
}

/**
 * Deletes the credentials file if present.
 * @remarks **Callers:** {@link main} when argv is `logout`. **Callees:** `unlink`.
 */
async function cmdLogout(): Promise<void> {
  try {
    await unlink(credentialsPath());
    console.log("Logged out.");
  } catch {
    console.log("No saved session.");
  }
}

/**
 * Prints stdout guidance for wiring LangChain agents to the map after `create`.
 * @remarks **Callers:** {@link cmdCreate} only. **Callees:** `console.log`.
 */
function printAgentPlayIntegrationGuide(): void {
  console.log("");
  console.log("How your agent appears on the play world");
  console.log("────────────────────────────────────────────");
  console.log(
    "  • One account API key: run `agent-play create-key` (after login) if you do not have one yet."
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
    "  • RemotePlayWorld({ apiKey: <account key> }) and addPlayer({ ..., agentId: <id below> })."
  );
  console.log("");
}

/**
 * POSTs to `/api/agents/api-key` to mint a new account API key (shown once).
 * @remarks **Callers:** {@link main}. **Callees:** {@link loadCredentials}, `fetch`.
 */
async function cmdCreateKey(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play login` first.");
    process.exitCode = 1;
    return;
  }
  const res = await fetch(`${cred.serverUrl}/api/agents/api-key`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cred.token}`,
    },
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
    console.error(`create-key failed (${res.status}): ${msg}`);
    process.exitCode = 1;
    return;
  }
  const json = JSON.parse(text) as { plainApiKey?: unknown };
  if (typeof json.plainApiKey !== "string") {
    console.error("Invalid response from server.");
    process.exitCode = 1;
    return;
  }
  console.log("API key (store securely; shown once):");
  console.log(json.plainApiKey);
  console.log("");
}

/**
 * GETs `/api/agents/api-key` to report whether a key exists (never prints the secret).
 * @remarks **Callers:** {@link main}. **Callees:** {@link loadCredentials}, `fetch`.
 */
async function cmdViewKeys(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play login` first.");
    process.exitCode = 1;
    return;
  }
  const res = await fetch(`${cred.serverUrl}/api/agents/api-key`, {
    headers: { authorization: `Bearer ${cred.token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`view-keys failed (${res.status}): ${text}`);
    process.exitCode = 1;
    return;
  }
  const json = JSON.parse(text) as {
    hasKey?: unknown;
    createdAt?: unknown;
  };
  if (json.hasKey === true) {
    const when =
      typeof json.createdAt === "string" ? json.createdAt : "unknown time";
    console.log(`Account API key: active (created ${when}).`);
    console.log(
      "The secret value cannot be shown again. Use the key you saved when you ran `agent-play create-key`."
    );
  } else {
    console.log("No API key for this account.");
    console.log("Run `agent-play create-key` to generate one (shown once).");
  }
}

/**
 * POSTs `/api/agents` to register a named agent; prints `agentId` and {@link printAgentPlayIntegrationGuide}.
 * @remarks **Callers:** {@link main}. **Callees:** {@link loadCredentials}, `fetch`, {@link printAgentPlayIntegrationGuide}.
 */
async function cmdCreate(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play login` first.");
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
      authorization: `Bearer ${cred.token}`,
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

/**
 * Lists agents then DELETEs `/api/agents?id=` for user-picked id.
 * @remarks **Callers:** {@link main}. **Callees:** {@link loadCredentials}, `fetch`, readline.
 */
async function cmdDelete(): Promise<void> {
  const cred = await loadCredentials();
  if (cred === null) {
    console.error("Run `agent-play login` first.");
    process.exitCode = 1;
    return;
  }
  const listRes = await fetch(`${cred.serverUrl}/api/agents`, {
    headers: { authorization: `Bearer ${cred.token}` },
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
      headers: { authorization: `Bearer ${cred.token}` },
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

/**
 * Dispatches on `process.argv[2]` to command handlers.
 * @remarks **Callers:** top-level `void main()`. **Callees:** `cmdLogin`, `cmdLogout`, `cmdCreate`, `cmdCreateKey`, `cmdViewKeys`, `cmdDelete`.
 */
async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "login") {
    await cmdLogin();
    return;
  }
  if (cmd === "logout") {
    await cmdLogout();
    return;
  }
  if (cmd === "create") {
    await cmdCreate();
    return;
  }
  if (cmd === "create-key" || cmd === "generate-key") {
    await cmdCreateKey();
    return;
  }
  if (cmd === "view-keys") {
    await cmdViewKeys();
    return;
  }
  if (cmd === "delete" || cmd === "remove") {
    await cmdDelete();
    return;
  }
  console.error(
    "Usage: agent-play login | logout | create-key | view-keys | create | delete"
  );
  process.exitCode = 1;
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
