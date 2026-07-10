import { NextRequest } from "next/server";
import { buildPlatformSpacePurchases } from "@/server/agent-play/platform-space-purchases";
import { verifyPlatformSpaceRequest } from "@/server/agent-play/platform-space-auth";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";

type RouteContext = { params: Promise<{ spaceId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { spaceId } = await context.params;
  logAgentPlayApi("GET platform/spaces/purchases", req, { spaceId });
  const auth = await verifyPlatformSpaceRequest(req, spaceId);
  if (!auth.ok) return auth.response;

  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "purchases temporarily unavailable" }, { status: 503 });
  }

  const sinceRaw = req.nextUrl.searchParams.get("sinceMs");
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const sinceMs =
    sinceRaw !== null && sinceRaw.length > 0 ? Number.parseInt(sinceRaw, 10) : undefined;
  const limit =
    limitRaw !== null && limitRaw.length > 0 ? Number.parseInt(limitRaw, 10) : undefined;

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const payload = await buildPlatformSpacePurchases({
    redis,
    hostId,
    spaceId: auth.spaceId,
    ...(sinceMs !== undefined && Number.isFinite(sinceMs) ? { sinceMs } : {}),
    ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
  });
  return Response.json(payload);
}
