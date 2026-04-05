import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getRedisSessionStore, getSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET session/details", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "session/details rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const store = getSessionStore();
  const meta = await store.getPublishedMetadata();
  const eventsLimit = Number(req.nextUrl.searchParams.get("eventsLimit") ?? "50");
  const events = await store.getRecentEventLog(
    Number.isFinite(eventsLimit) ? eventsLimit : 50
  );
  const includeSnapshot = req.nextUrl.searchParams.get("includeSnapshot") === "1";
  const body: Record<string, unknown> = {
    source: getRedisSessionStore() !== null ? "redis" : "memory",
    meta,
    recentEvents: events,
  };
  if (includeSnapshot) {
    body.snapshot = await store.getSnapshotJson();
  }
  agentPlayVerbose("api", "session/details ok", {
    eventCount: events.length,
    includeSnapshot,
  });
  return Response.json(body);
}
