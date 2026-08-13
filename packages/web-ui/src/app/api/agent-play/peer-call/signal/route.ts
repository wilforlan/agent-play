import { NextRequest } from "next/server";
import { WORLD_PEER_CALL_SIGNAL_EVENT } from "@agent-play/geography-mesh";
import { z } from "zod";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import { getPlayWorld, getSessionStore } from "@/server/get-world";

const PeerCallSignalBodySchema = z.object({
  callId: z.string().min(1),
  fromHumanId: z.string().min(1),
  toHumanId: z.string().min(1),
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown(),
});

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
  logAgentPlayApi("POST peer-call/signal", req);
  const rawSid = req.nextUrl.searchParams.get("sid");
  if (rawSid === null || rawSid.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = rawSid.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = PeerCallSignalBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  if (parsed.data.fromHumanId === parsed.data.toHumanId) {
    return Response.json({ error: "invalid peer" }, { status: 400 });
  }

  await getPlayWorld();
  const store = getSessionStore();
  const call = await store.getPeerCall(parsed.data.callId);
  if (call === null || call.status !== "active") {
    return Response.json({ error: "call_not_active" }, { status: 404 });
  }
  const parties = new Set([call.callerId, call.calleeId]);
  if (
    !parties.has(parsed.data.fromHumanId) ||
    !parties.has(parsed.data.toHumanId)
  ) {
    return Response.json({ error: "not_a_party" }, { status: 403 });
  }

  const rev = await store.getSnapshotRev();
  await store.publishWorldFanout(rev, WORLD_PEER_CALL_SIGNAL_EVENT, parsed.data);
  agentPlayVerbose("api", "peer-call signal", {
    sid,
    callId: parsed.data.callId,
    from: parsed.data.fromHumanId,
    to: parsed.data.toHumanId,
    kind: parsed.data.kind,
  });
  return Response.json({ ok: true });
}
