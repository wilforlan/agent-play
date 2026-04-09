import { NextRequest } from "next/server";
import type { StoredAgentRecord } from "@/server/agent-play/agent-repository";
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
  const repo = await getRepository();
  if (repo === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await repo.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const agents = await repo.listAgentsForNode(nodeId);
  return Response.json({ agents: agents.map(publicAgent) });
}

/**
 * @deprecated Use POST /api/nodes/agent-node. This endpoint no longer creates agents.
 */
export async function POST(req: NextRequest) {
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = await getRepository();
  if (repo === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  if (!(await repo.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(
    {
      error:
        "deprecated: POST /api/agents is removed. Use POST /api/nodes/agent-node and then world.addPlayer.",
    },
    {
      status: 410,
      headers: {
        deprecation: "true",
        sunset: "2026-06-30",
      },
    }
  );
}

export async function DELETE(req: NextRequest) {
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (id === null || id.length === 0) {
    return Response.json({ error: "missing id" }, { status: 400 });
  }
  const repo = await getRepository();
  if (repo === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  if (!(await repo.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const agent = await repo.getAgent(id);
  if (agent === null) {
    return Response.json({ ok: false });
  }
  if (agent.nodeId !== nodeId) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const ok = await repo.deleteAgent(id);
  return Response.json({ ok });
}
