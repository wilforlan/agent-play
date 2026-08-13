import { NextRequest } from "next/server";
import { GeographyCoarseBodySchema } from "@agent-play/geography-mesh";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import {
  computeAllNeighborPayloads,
  publishGeographyNeighborsFanout,
} from "@/server/agent-play/geography-membership.js";
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
  logAgentPlayApi("POST geography/coarse", req);
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

  const parsed = GeographyCoarseBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  await getPlayWorld();
  const store = getSessionStore();
  const now = Date.now();
  const updated = await store.updateGeographyMemberCoarse({
    humanId: parsed.data.humanId,
    x: parsed.data.x,
    y: parsed.data.y,
    coarseRevisedAt: now,
    ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
  });
  if (updated === null) {
    return Response.json({ error: "not_a_member" }, { status: 404 });
  }

  const payloads = computeAllNeighborPayloads({
    members: updated.next,
    nowMs: now,
  });
  await publishGeographyNeighborsFanout({ store, payloads });
  agentPlayVerbose("api", "geography coarse", {
    sid,
    humanId: parsed.data.humanId,
  });
  return Response.json({
    ok: true,
    neighbors: payloads.find((p) => p.humanId === parsed.data.humanId) ?? null,
  });
}
