import { NextRequest } from "next/server";
import type { StoredAgentRecord } from "@/server/agent-play/agent-repository";
import {
  createNodeAccount,
  parseCreateNodeBody,
} from "@/server/agent-play/create-node-account";
import { getRepository } from "@/server/get-world";

function publicAgent(a: StoredAgentRecord) {
  return {
    agentId: a.agentId,
    name: a.name,
    toolNames: a.toolNames,
    zoneCount: a.zoneCount,
    yieldCount: a.yieldCount,
    flagged: a.flagged,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json(
      { error: "repository not configured" },
      { status: 503 }
    );
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await repository.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const mainNode = await repository.getNode(nodeId);
  if (mainNode === null) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const agentNodes = await repository.listAgentsForNode(nodeId);
  return Response.json({
    genesisNodeId: repository.getGenesisNodeId(),
    mainNode,
    agentNodes: agentNodes.map(publicAgent),
  });
}

export async function DELETE(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json(
      { error: "repository not configured" },
      { status: 503 }
    );
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: `unauthorized: missing ${nodeId.length === 0 ? "nodeId" : ""} ${passw.length === 0 ? "passw" : ""}` }, { status: 401 });
  }
  if (!(await repository.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized: verifyNodePassw failed" }, { status: 401 });
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
  const confirmNodeId = (body as { confirmNodeId?: unknown }).confirmNodeId;
  if (typeof confirmNodeId !== "string" || confirmNodeId.trim() !== nodeId) {
    return Response.json(
      {
        error:
          "confirmNodeId in JSON body must exactly match x-node-id for this destructive operation",
      },
      { status: 400 }
    );
  }
  try {
    const result = await repository.deleteMainNodeCascade(nodeId);
    return Response.json({ ok: true, deletedAgentCount: result.deletedAgentCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("genesis")) {
      return Response.json({ error: msg }, { status: 403 });
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json(
      { error: "repository not configured" },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = parseCreateNodeBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  console.log("parsed input on POST /api/nodes", parsed);
  try {
    const result = await createNodeAccount(repository, {
      kind: parsed.kind,
      passw: parsed.passw,
    });
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("already exists") ? 409 : 400;
    return Response.json({ error: msg }, { status });
  }
}
