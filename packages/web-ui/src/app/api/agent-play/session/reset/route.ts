import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST session/reset", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "session/reset rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const newSid = await world.resetSession();
  agentPlayVerbose("api", "session/reset ok", {
    newSidPrefix: `${newSid.slice(0, 8)}…`,
  });
  return Response.json({ sid: newSid });
}
