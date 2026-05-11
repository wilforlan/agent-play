import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type AgentPlayAgentNodeEntry = {
  nodeId: string;
  passw: string;
  createdAt: string;
};

/**
 * Shape of `~/.agent-play/credentials.json` written by **`agent-play`** (create-main-node, create-agent-node).
 *
 * **`passw`** is the **human-readable** passphrase as displayed during creation. The CLI and SDK
 * never send this value over the wire; they hash it locally with
 * **`nodeCredentialsMaterialFromHumanPassphrase`** (or, in convenience helpers, via
 * **`nodeCredentialFromHumanPhrase`**) and forward only the resulting `passwHash` to the server.
 */
export type AgentPlayCredentialsFile = {
  serverUrl: string;
  nodeId: string;
  passw: string;
  secretFilePath?: string;
  agentNodes?: AgentPlayAgentNodeEntry[];
};

function isAgentNodeEntry(row: unknown): row is AgentPlayAgentNodeEntry {
  if (typeof row !== "object" || row === null) return false;
  const r = row as {
    nodeId?: unknown;
    passw?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof r.nodeId === "string" &&
    typeof r.passw === "string" &&
    typeof r.createdAt === "string"
  );
}

export function parseAgentPlayCredentialsJson(
  json: unknown
): AgentPlayCredentialsFile | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as {
    serverUrl?: unknown;
    nodeId?: unknown;
    passw?: unknown;
    secretFilePath?: unknown;
    agentNodes?: unknown;
  };
  if (
    typeof o.serverUrl !== "string" ||
    typeof o.nodeId !== "string" ||
    typeof o.passw !== "string"
  ) {
    return null;
  }
  const file: AgentPlayCredentialsFile = {
    serverUrl: o.serverUrl.replace(/\/$/, ""),
    nodeId: o.nodeId,
    passw: o.passw,
  };
  if (typeof o.secretFilePath === "string") {
    file.secretFilePath = o.secretFilePath;
  }
  if (Array.isArray(o.agentNodes)) {
    file.agentNodes = o.agentNodes
      .filter(isAgentNodeEntry)
      .map((row) => ({ ...row }));
  }
  return file;
}

export function resolveAgentPlayCredentialsPath(): string {
  const fromEnv = process.env.AGENT_PLAY_CREDENTIALS_PATH;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return join(homedir(), ".agent-play", "credentials.json");
}

export async function loadAgentPlayCredentialsFileFromPath(
  filePath: string
): Promise<AgentPlayCredentialsFile | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseAgentPlayCredentialsJson(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function loadAgentPlayCredentialsFileFromPathSync(
  filePath: string
): AgentPlayCredentialsFile | null {
  try {
    const raw = readFileSync(filePath, "utf8");
    return parseAgentPlayCredentialsJson(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
