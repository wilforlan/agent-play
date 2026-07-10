import { NextRequest } from "next/server";
import { buildPlatformSpaceOverview } from "@/server/agent-play/platform-space-overview";
import { verifyPlatformSpaceRequest } from "@/server/agent-play/platform-space-auth";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSessionStore, getSharedRedisClient } from "@/server/get-world";

type RouteContext = { params: Promise<{ spaceId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { spaceId } = await context.params;
  logAgentPlayApi("GET platform/spaces/overview", req, { spaceId });
  const auth = await verifyPlatformSpaceRequest(req, spaceId);
  if (!auth.ok) return auth.response;

  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "overview temporarily unavailable" }, { status: 503 });
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const store = getSessionStore();
  const payload = await buildPlatformSpaceOverview({
    redis,
    hostId,
    spaceId: auth.spaceId,
    store,
  });
  return Response.json(payload);
}
