import { NextRequest } from "next/server";
import { getRepository } from "@/server/get-world";

function readNodeAuthHeaders(req: NextRequest): {
  nodeId: string;
  passwHash: string;
} | null {
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passwHash = req.headers.get("x-node-passw")?.trim() ?? "";
  if (nodeId.length === 0 || passwHash.length === 0) {
    return null;
  }
  return { nodeId, passwHash };
}

export async function POST(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  const auth = readNodeAuthHeaders(req);
  if (auth === null) {
    return Response.json(
      { error: "missing x-node-id / x-node-passw" },
      { status: 401 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const raw = body as { nodeId?: unknown; rootKey?: unknown; mainNodeId?: unknown };
  const bodyNodeId =
    typeof raw.nodeId === "string" && raw.nodeId.trim().length > 0
      ? raw.nodeId.trim()
      : auth.nodeId;
  if (bodyNodeId !== auth.nodeId) {
    return Response.json(
      { error: "x-node-id does not match body nodeId" },
      { status: 400 }
    );
  }
  const rootKey =
    typeof raw.rootKey === "string" && raw.rootKey.trim().length > 0
      ? raw.rootKey.trim().toLowerCase()
      : repository.getGenesisNodeId();
  const result = await repository.validateNodeIdentity({
    nodeId: auth.nodeId,
    rootKey,
    passwHash: auth.passwHash,
    mainNodeId:
      typeof raw.mainNodeId === "string" && raw.mainNodeId.trim().length > 0
        ? raw.mainNodeId.trim()
        : undefined,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
