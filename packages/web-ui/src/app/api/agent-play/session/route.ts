import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { getPlayWorld, getSessionStore } from "@/server/get-world";

export async function GET() {
  agentPlayVerbose("api", "GET /api/agent-play/session");
  await getPlayWorld();
  const sid = getSessionStore().getSessionId();
  agentPlayVerbose("api", "GET /api/agent-play/session response", {
    sidPrefix: `${sid.slice(0, 8)}…`,
    sidLength: sid.length,
  });
  return Response.json({ sid });
}
