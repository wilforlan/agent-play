import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST proximity-action", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    agentPlayVerbose("api", "proximity-action rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "proximity-action rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const body = (await req.json()) as {
    fromPlayerId?: unknown;
    toPlayerId?: unknown;
    action?: unknown;
  };
  if (
    typeof body.fromPlayerId !== "string" ||
    typeof body.toPlayerId !== "string" ||
    typeof body.action !== "string"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const action = body.action;
  if (
    action !== "assist" &&
    action !== "chat" &&
    action !== "zone" &&
    action !== "yield"
  ) {
    return Response.json({ error: "invalid action" }, { status: 400 });
  }
  try {
    const fromPlayerId = await world.normalizeProximityFromPlayerId(
      body.fromPlayerId
    );
    await world.recordProximityAction({
      fromPlayerId,
      toPlayerId: body.toPlayerId.trim(),
      action,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "proximity-action error", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
  agentPlayVerbose("api", "proximity-action ok", {
    action: body.action,
    toPlayerId: body.toPlayerId,
  });
  return Response.json(
    { ok: true },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
