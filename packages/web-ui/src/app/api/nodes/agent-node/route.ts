import { NextRequest } from "next/server";
import {
  createAgentNodeAccount,
  parseCreateAgentNodeBody,
} from "@/server/agent-play/create-agent-node-account";
import { getRepository } from "@/server/get-world";

export async function POST(req: NextRequest) {
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = parseCreateAgentNodeBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  try {
    if (parsed.parentNodeId !== undefined && parsed.parentNodeId !== nodeId) {
      return Response.json(
        { error: "parentNodeId must match authenticated main node" },
        { status: 400 }
      );
    }
    const result = await createAgentNodeAccount({
      repository,
      mainNodeId: nodeId,
      agentNodeId: parsed.agentNodeId,
      agentNodePassw: parsed.agentNodePassw,
    });
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
