import type {
  AgentRepository,
  CreateNodeRecordInput,
} from "./agent-repository.js";

export type ParseCreateNodeBodyResult =
  | { ok: true; kind: "main"; nodeId: string; passwHash: string }
  | {
      ok: true;
      kind: "space";
      spaceId: string;
      passwHash?: string;
    }
  | { ok: false; error: string };

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function parseCreateNodeBody(body: unknown): ParseCreateNodeBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const raw = body as {
    kind?: unknown;
    nodeId?: unknown;
    passwHash?: unknown;
    spaceId?: unknown;
  };
  if (raw.kind === "space") {
    if (typeof raw.spaceId !== "string" || raw.spaceId.trim().length === 0) {
      return { ok: false, error: "spaceId required for kind space" };
    }
    if (raw.passwHash !== undefined && !nonEmptyString(raw.passwHash)) {
      return { ok: false, error: "passwHash must be non-empty string when set" };
    }
    return {
      ok: true,
      kind: "space",
      spaceId: raw.spaceId.trim(),
      ...(nonEmptyString(raw.passwHash) ? { passwHash: raw.passwHash } : {}),
    };
  }
  if (raw.kind !== undefined && raw.kind !== "main") {
    return { ok: false, error: "kind must be main or space" };
  }
  if (!nonEmptyString(raw.nodeId)) {
    return { ok: false, error: "nodeId required" };
  }
  if (!nonEmptyString(raw.passwHash)) {
    return { ok: false, error: "passwHash required" };
  }
  return {
    ok: true,
    kind: "main",
    nodeId: raw.nodeId.trim(),
    passwHash: raw.passwHash,
  };
}

export async function createNodeAccount(
  repository: AgentRepository,
  input: CreateNodeRecordInput
): Promise<{ nodeId: string; phrase?: string }> {
  return repository.createNode(input);
}
