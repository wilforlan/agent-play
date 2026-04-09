import { NextRequest } from "next/server";
import { getRepository } from "@/server/get-world";

export async function POST(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
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
  if (typeof raw.nodeId !== "string" || raw.nodeId.trim().length === 0) {
    return Response.json({ error: "nodeId required" }, { status: 400 });
  }
  if (typeof raw.rootKey !== "string" || raw.rootKey.trim().length === 0) {
    return Response.json({ error: "rootKey required" }, { status: 400 });
  }
  const result = await repository.validateNodeIdentity({
    nodeId: raw.nodeId.trim(),
    rootKey: raw.rootKey.trim().toLowerCase(),
    mainNodeId:
      typeof raw.mainNodeId === "string" && raw.mainNodeId.trim().length > 0
        ? raw.mainNodeId.trim()
        : undefined,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
