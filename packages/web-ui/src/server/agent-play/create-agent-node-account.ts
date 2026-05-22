import type { AgentRepository } from "./agent-repository.js";

export type ParseCreateAgentNodeBodyResult =
  | {
      ok: true;
      kind: "agent";
      agentNodeId: string;
      agentNodePasswHash: string;
      parentNodeId?: string;
    }
  | { ok: false; error: string };

export function parseCreateAgentNodeBody(
  body: unknown
): ParseCreateAgentNodeBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const raw = body as {
    kind?: unknown;
    agentNodeId?: unknown;
    agentNodePasswHash?: unknown;
    parentNodeId?: unknown;
  };
  if (raw.kind !== undefined && raw.kind !== "agent") {
    return { ok: false, error: "kind must be agent" };
  }
  if (
    typeof raw.agentNodeId !== "string" ||
    raw.agentNodeId.trim().length === 0
  ) {
    return { ok: false, error: "agentNodeId required" };
  }
  if (
    typeof raw.agentNodePasswHash !== "string" ||
    raw.agentNodePasswHash.trim().length === 0
  ) {
    return { ok: false, error: "agentNodePasswHash required" };
  }
  const base: {
    ok: true;
    kind: "agent";
    agentNodeId: string;
    agentNodePasswHash: string;
  } = {
    ok: true,
    kind: "agent",
    agentNodeId: raw.agentNodeId.trim(),
    agentNodePasswHash: raw.agentNodePasswHash.trim(),
  };
  if (
    typeof raw.parentNodeId === "string" &&
    raw.parentNodeId.trim().length > 0
  ) {
    return { ...base, parentNodeId: raw.parentNodeId.trim() };
  }
  return base;
}

export async function createAgentNodeAccount(options: {
  repository: AgentRepository;
  mainNodeId: string;
  agentNodeId: string;
  agentNodePasswHash: string;
}): Promise<{ agentId: string }> {
  const parentNodeId = options.mainNodeId;
  const created = await options.repository.createAgentNode({
    parentNodeId,
    agentId: options.agentNodeId,
    passwHash: options.agentNodePasswHash,
  });
  return { agentId: created.agentId };
}
