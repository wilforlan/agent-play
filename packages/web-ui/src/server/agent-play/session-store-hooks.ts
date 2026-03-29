import type { PlayWorld } from "./play-world.js";
import type { RedisSessionStore, SessionEventLogEntry } from "./redis-session-store.js";
import {
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "./play-transport.js";

function summarizePayload(payload: unknown): string {
  try {
    const s = JSON.stringify(payload);
    return s.length > 2_000 ? `${s.slice(0, 2_000)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

export function attachSessionStoreEventHooks(
  world: PlayWorld,
  store: RedisSessionStore
): void {
  const log = (type: string, payload: unknown): void => {
    const entry: SessionEventLogEntry = {
      type,
      at: new Date().toISOString(),
      summary: summarizePayload(payload),
    };
    void store.appendEventLog(entry);
  };

  world.on(WORLD_JOURNEY_EVENT, (payload: unknown) => {
    log(WORLD_JOURNEY_EVENT, payload);
  });
  world.on(PLAYER_ADDED_EVENT, (payload: unknown) => {
    log(PLAYER_ADDED_EVENT, payload);
  });
  world.on(WORLD_STRUCTURES_EVENT, (payload: unknown) => {
    log(WORLD_STRUCTURES_EVENT, payload);
  });
  world.on(WORLD_INTERACTION_EVENT, (payload: unknown) => {
    log(WORLD_INTERACTION_EVENT, payload);
  });
  world.on(WORLD_AGENT_SIGNAL_EVENT, (payload: unknown) => {
    log(WORLD_AGENT_SIGNAL_EVENT, payload);
  });
}
