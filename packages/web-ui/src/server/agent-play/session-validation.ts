import { agentPlayVerbose } from "./agent-play-debug.js";
import { getPlayWorld, getRedisSessionStore } from "@/server/get-world";

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
  const store = getRedisSessionStore();
  let fromRedis = false;
  if (store !== null) {
    fromRedis = await store.isValidSession(normalized);
  }
  const fromMemory = world.isSessionSid(normalized);
  const ok =
    store !== null ? fromRedis || fromMemory : fromMemory;
  let worldSidPrefix: string | null = null;
  try {
    worldSidPrefix = `${world.getSessionId().slice(0, 8)}…`;
  } catch {
    worldSidPrefix = null;
  }
  agentPlayVerbose("session-validation", "validate", {
    normalizedLength: normalized.length,
    normalizedPrefix: `${normalized.slice(0, 8)}…`,
    hasRedisStore: store !== null,
    fromRedis,
    fromMemory,
    worldSidPrefix,
    ok,
  });
  return ok;
}
