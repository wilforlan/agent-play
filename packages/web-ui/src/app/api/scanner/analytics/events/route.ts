import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import {
  computeAnalyticsFunnel,
  getAnalyticsPropertyBreakdown,
  listAnalyticsEvents,
} from "@/server/analytics/analytics-payload";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/analytics/events", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const view = req.nextUrl.searchParams.get("view");
  if (view === "funnel") {
    const steps = (req.nextUrl.searchParams.get("steps") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const funnel = await computeAnalyticsFunnel({ redis, hostId, steps });
    return Response.json({ funnel });
  }
  const breakdownEvent = req.nextUrl.searchParams.get("breakdownEvent");
  const breakdownProperty = req.nextUrl.searchParams.get("breakdownProperty");
  if (
    breakdownEvent !== null &&
    breakdownEvent.length > 0 &&
    breakdownProperty !== null &&
    breakdownProperty.length > 0
  ) {
    const breakdown = await getAnalyticsPropertyBreakdown({
      redis,
      hostId,
      event: breakdownEvent,
      property: breakdownProperty,
    });
    return Response.json({ breakdown });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const fieldsParam = req.nextUrl.searchParams.get("fields");
  const fields =
    fieldsParam === "full" || fieldsParam === "summary" ? fieldsParam : "summary";
  const event = req.nextUrl.searchParams.get("event") ?? undefined;
  const page = await listAnalyticsEvents({
    redis,
    hostId,
    limit: Number.isFinite(limit) ? limit : 25,
    cursor,
    since,
    fields,
    event,
  });
  return Response.json(page);
}
