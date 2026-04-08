import type { AgentRepository } from "./agent-repository.js";

export type ParseCreateNodeBodyResult =
  | { ok: true; passw: string }
  | { ok: false; error: string };

export function parseCreateNodeBody(body: unknown): ParseCreateNodeBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const passw = (body as { passw?: unknown }).passw;
  if (typeof passw !== "string" || passw.length === 0) {
    return { ok: false, error: "passw required" };
  }
  return { ok: true, passw };
}

export async function createNodeAccount(
  repository: AgentRepository,
  passw: string
): Promise<{ nodeId: string }> {
  return repository.createNode(passw);
}
