import { NextRequest } from "next/server";
import { GeographySignalBodySchema } from "@agent-play/geography-mesh";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { publishGeographySignalFanout } from "@/server/agent-play/geography-membership.js";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import { getPlayWorld, getSessionStore } from "@/server/get-world";

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
  logAgentPlayApi("POST geography/signal", req);
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

  const parsed = GeographySignalBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  if (parsed.data.fromHumanId === parsed.data.toHumanId) {
    return Response.json({ error: "invalid peer" }, { status: 400 });
  }

  await getPlayWorld();
  const store = getSessionStore();
  const members = await store.getGeographyMembers();
  if (
    !members.has(parsed.data.fromHumanId) ||
    !members.has(parsed.data.toHumanId)
  ) {
    return Response.json({ error: "not_a_member" }, { status: 404 });
  }

  await publishGeographySignalFanout({ store, signal: parsed.data });
  agentPlayVerbose("api", "geography signal", {
    sid,
    from: parsed.data.fromHumanId,
    to: parsed.data.toHumanId,
    kind: parsed.data.kind,
  });
  return Response.json({ ok: true });
}
