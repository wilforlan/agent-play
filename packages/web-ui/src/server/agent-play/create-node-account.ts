import type {
  AgentRepository,
  CreateNodeRecordInput,
} from "./agent-repository.js";

export type ParseCreateNodeBodyResult =
  | { ok: true; kind: "main"; passw: string }
  | {
      ok: true;
      kind: "space";
      spaceId: string;
      passw?: string;
    }
  | { ok: false; error: string };

export function parseCreateNodeBody(body: unknown): ParseCreateNodeBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const kindRaw = (body as { kind?: unknown }).kind;
  const passw = (body as { passw?: unknown }).passw;
  if (kindRaw === "space") {
    const spaceIdRaw = (body as { spaceId?: unknown }).spaceId;
    if (typeof spaceIdRaw !== "string" || spaceIdRaw.trim().length === 0) {
      return { ok: false, error: "spaceId required for kind space" };
    }
    if (
      passw !== undefined &&
      (typeof passw !== "string" || passw.length === 0)
    ) {
      return { ok: false, error: "passw must be non-empty string when set" };
    }
    return {
      ok: true,
      kind: "space",
      spaceId: spaceIdRaw.trim(),
      ...(typeof passw === "string" && passw.length > 0 ? { passw } : {}),
    };
  }
  if (kindRaw !== undefined && kindRaw !== "main") {
    return { ok: false, error: "kind must be main or space" };
  }
  if (typeof passw !== "string" || passw.length === 0) {
    return { ok: false, error: "passw required" };
  }
  return { ok: true, kind: "main", passw };
}

export async function createNodeAccount(
  repository: AgentRepository,
  input: CreateNodeRecordInput
): Promise<{ nodeId: string; phrase?: string }> {
  return repository.createNode(input);
}
