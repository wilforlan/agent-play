import { NextRequest } from "next/server";
import { AnalyticsEventSchema } from "@agent-play/sdk";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { trackEvent } from "@/server/analytics/analytics-tracker";
import { getSharedRedisClient } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST analytics/track", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Analytics unavailable" }, { status: 503 });
  }
  const sid = req.nextUrl.searchParams.get("sid")?.trim() ?? "";
  if (sid.length === 0) {
    return Response.json({ error: "sid required" }, { status: 400 });
  }
  const sessionOk = await validateAgentPlaySession(sid);
  if (!sessionOk) {
    return Response.json({ error: "invalid session" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const parsed = AnalyticsEventSchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    messageId:
      typeof body === "object" &&
      body !== null &&
      "messageId" in body &&
      typeof (body as { messageId: unknown }).messageId === "string"
        ? (body as { messageId: string }).messageId
        : `client-${crypto.randomUUID()}`,
    timestamp:
      typeof body === "object" &&
      body !== null &&
      "timestamp" in body &&
      typeof (body as { timestamp: unknown }).timestamp === "string"
        ? (body as { timestamp: string }).timestamp
        : new Date().toISOString(),
    context: {
      hostId,
      sid,
      library: "agent-play-client",
    },
  });
  if (!parsed.success) {
    return Response.json({ error: "invalid event" }, { status: 400 });
  }
  await trackEvent({ redis, hostId, event: parsed.data });
  return Response.json({ ok: true });
}
