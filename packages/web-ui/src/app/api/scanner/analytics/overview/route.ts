import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { readAnalyticsOverviewCache } from "@/server/analytics/analytics-cache";
import { buildAnalyticsOverview } from "@/server/analytics/analytics-payload";
import { getSharedRedisClient } from "@/server/get-world";
import {
  buildAnalyticsOverviewEtag,
  matchesIfNoneMatch,
  notModifiedResponse,
  withScannerCacheHeaders,
} from "@/server/scanner/scanner-http-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/analytics/overview", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const [overview, cache] = await Promise.all([
    buildAnalyticsOverview({ redis, hostId }),
    readAnalyticsOverviewCache({ redis, hostId }),
  ]);
  const etag = buildAnalyticsOverviewEtag({
    eventsLast24h: overview.eventsLast24h,
    lastStreamId: cache.lastStreamId,
    migrationStatus: overview.migrationStatus,
  });
  if (matchesIfNoneMatch(req.headers.get("if-none-match"), etag)) {
    return notModifiedResponse(etag);
  }
  return withScannerCacheHeaders(Response.json(overview), {
    etag,
    maxAgeSeconds: 15,
  });
}
