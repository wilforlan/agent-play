import { agentPlayVerbose } from "./agent-play-debug.js";
import { getPlayWorld } from "@/server/get-world";

function normalizeSid(sid: string): string {
  return sid.trim();
}

export async function validateAgentPlaySession(sid: string): Promise<boolean> {
  const normalized = normalizeSid(sid);
  if (normalized.length === 0) {
    agentPlayVerbose("session-validation", "reject empty or whitespace sid", {
      rawLength: sid.length,
    });
    return false;
  }
  const world = await getPlayWorld();
  const ok = await world.isSessionSid(normalized);
  agentPlayVerbose("session-validation", "validate", {
    normalizedLength: normalized.length,
    normalizedPrefix: `${normalized.slice(0, 8)}…`,
    ok,
  });
  return ok;
}
