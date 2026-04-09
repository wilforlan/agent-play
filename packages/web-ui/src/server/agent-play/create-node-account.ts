import type { AgentRepository } from "./agent-repository.js";

export type ParseCreateNodeBodyResult =
  | { ok: true; kind: "main"; passw: string }
  | { ok: false; error: string };

export function parseCreateNodeBody(body: unknown): ParseCreateNodeBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const kind = (body as { kind?: unknown }).kind;
  const passw = (body as { passw?: unknown }).passw;
  if (kind !== undefined && kind !== "main") {
    return { ok: false, error: "kind must be main" };
  }
  if (typeof passw !== "string" || passw.length === 0) {
    return { ok: false, error: "passw required" };
  }
  return { ok: true, kind: "main", passw };
}

export async function createNodeAccount(
  repository: AgentRepository,
  input: { kind: "main"; passw: string }
): Promise<{ nodeId: string }> {
  return repository.createNode(input);
}
