import { NextRequest } from "next/server";
import { buildPlatformAnalyticsPayload } from "@/server/agent-play/platform-analytics-payload";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET platform-analytics", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json(
      { error: "Analytics temporarily unavailable" },
      { status: 503 }
    );
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const payload = await buildPlatformAnalyticsPayload({ redis, hostId });
  return Response.json(payload);
}
