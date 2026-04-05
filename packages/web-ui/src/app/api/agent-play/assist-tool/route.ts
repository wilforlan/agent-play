import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST assist-tool", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const body = (await req.json()) as {
    targetPlayerId?: unknown;
    toolName?: unknown;
    args?: unknown;
  };
  if (
    typeof body.targetPlayerId !== "string" ||
    typeof body.toolName !== "string"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const args: Record<string, unknown> =
    isRecord(body.args) && !Array.isArray(body.args) ? body.args : {};
  try {
    const world = await getPlayWorld();
    await world.recordAssistToolInvocation({
      targetPlayerId: body.targetPlayerId,
      toolName: body.toolName,
      args,
    });
    agentPlayVerbose("api", "assist-tool ok", {
      target: body.targetPlayerId,
      tool: body.toolName,
    });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "assist-tool error", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
