import { NextRequest } from "next/server";
import {
  GeographyMembershipBodySchema,
  type GeographyMember,
} from "@agent-play/geography-mesh";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import {
  computeAllNeighborPayloads,
  publishGeographyMembershipFanout,
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
  logAgentPlayApi("POST geography/membership", req);
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

  const parsed = GeographyMembershipBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  await getPlayWorld();
  const store = getSessionStore();
  const now = Date.now();

  if (parsed.data.action === "leave") {
    const { prev, next } = await store.leaveGeographyMember(
      parsed.data.humanId
    );
    await publishGeographyMembershipFanout({
      store,
      data: {
        action: "leave",
        humanId: parsed.data.humanId,
        memberCount: next.size,
      },
    });
    const payloads = computeAllNeighborPayloads({ members: next, nowMs: now });
    await publishGeographyNeighborsFanout({ store, payloads });
    agentPlayVerbose("api", "geography membership leave", {
      sid,
      humanId: parsed.data.humanId,
      prevCount: prev.size,
    });
    return Response.json({ ok: true, memberCount: next.size });
  }

  const member: GeographyMember = {
    humanId: parsed.data.humanId,
    name: parsed.data.name,
    x: parsed.data.x,
    y: parsed.data.y,
    joinedAt: now,
    coarseRevisedAt: now,
    ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
  };

  const result = await store.joinGeographyMember(member);
  if (!result.ok) {
    return Response.json(
      {
        error: "cap_reached",
        message: "Geography membership is full (100).",
        memberCount: result.memberCount,
        cap: result.cap,
      },
      { status: 409 }
    );
  }

  await publishGeographyMembershipFanout({
    store,
    data: {
      action: result.joined ? "join" : "update",
      humanId: member.humanId,
      memberCount: result.next.size,
    },
  });
  const payloads = computeAllNeighborPayloads({
    members: result.next,
    nowMs: now,
  });
  await publishGeographyNeighborsFanout({ store, payloads });
  agentPlayVerbose("api", "geography membership join", {
    sid,
    humanId: member.humanId,
    joined: result.joined,
  });
  return Response.json({
    ok: true,
    joined: result.joined,
    memberCount: result.next.size,
    neighbors: payloads.find((p) => p.humanId === member.humanId) ?? {
      humanId: member.humanId,
      neighborIds: [],
      truncated: false,
      memberCount: result.next.size,
    },
  });
}
