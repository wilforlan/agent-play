import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { readAnalyticsOverviewCache } from "@/server/analytics/analytics-cache";
import { getSharedRedisClient } from "@/server/get-world";
import {
  buildScannerHeadEtag,
  matchesIfNoneMatch,
  notModifiedResponse,
  withScannerCacheHeaders,
} from "@/server/scanner/scanner-http-cache";
import { buildScannerOverview } from "@/server/scanner/scanner-payload";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/head", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const [payload, analyticsCache] = await Promise.all([
    buildScannerOverview({ redis, hostId }),
    readAnalyticsOverviewCache({ redis, hostId }),
  ]);
  const etag = buildScannerHeadEtag({
    snapshotRev: payload.head.snapshotRev,
    lastStreamId: analyticsCache.lastStreamId,
    migrationStatus: payload.head.migrationStatus,
  });
  if (matchesIfNoneMatch(req.headers.get("if-none-match"), etag)) {
    return notModifiedResponse(etag);
  }
  return withScannerCacheHeaders(Response.json(payload), {
    etag,
    maxAgeSeconds: 5,
    staleWhileRevalidateSeconds: 30,
  });
}
