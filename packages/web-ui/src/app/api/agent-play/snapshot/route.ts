import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { readResolvedSnapshot } from "@/server/agent-play/read-resolved-snapshot";
import { getPlayWorld, getSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET snapshot", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    agentPlayVerbose("api", "snapshot rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "snapshot rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  await getPlayWorld();
  const store = getSessionStore();
  const snap = await readResolvedSnapshot({ sid, store });
  void store.persistSnapshot(snap);
  agentPlayVerbose("api", "snapshot ok", {
    agentCount: snap.worldMap.occupants.filter((o) => o.kind === "agent")
      .length,
  });
  return Response.json(snap, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
