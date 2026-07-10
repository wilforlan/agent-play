import { NextRequest } from "next/server";
import { requireAdminSession } from "@/server/agent-play/admin-auth";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { rebuildAnalyticsCacheFromStream } from "@/server/analytics/analytics-cache";
import { runAnalyticsBackfill } from "@/server/analytics/analytics-backfill";
import { getSharedRedisClient } from "@/server/get-world";
import { rebuildScannerCacheFromIndexes } from "@/server/scanner/scanner-cache";
import { runScannerBackfill } from "@/server/scanner/scanner-backfill";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = requireAdminSession(req);
  if (denied !== null) {
    return denied;
  }
  logAgentPlayApi("POST admin/scanner/backfill", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const [scanner, analytics] = await Promise.all([
    runScannerBackfill({ redis, hostId }),
    runAnalyticsBackfill({ redis, hostId }),
  ]);
  await Promise.all([
    rebuildScannerCacheFromIndexes({ redis, hostId }),
    rebuildAnalyticsCacheFromStream({ redis, hostId }),
  ]);
  return Response.json({ scanner, analytics, cacheRebuilt: true });
}
