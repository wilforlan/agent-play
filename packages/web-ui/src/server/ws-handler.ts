import type { WebSocket } from "ws";
import { getPlayWorld } from "@/server/get-world";
import {
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "@/server/agent-play/play-transport";

export async function attachAgentPlayWs(ws: WebSocket): Promise<void> {
  const world = await getPlayWorld();
  const pairs: Array<[string, (...args: unknown[]) => void]> = [];
  const wrap = (ev: string) => {
    const fn = (payload: unknown) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ event: ev, payload }));
      }
    };
    pairs.push([ev, fn]);
    world.on(ev, fn);
  };
  wrap(PLAYER_ADDED_EVENT);
  wrap(WORLD_STRUCTURES_EVENT);
  wrap(WORLD_INTERACTION_EVENT);
  wrap(WORLD_AGENT_SIGNAL_EVENT);
  wrap(WORLD_JOURNEY_EVENT);

  ws.on("close", () => {
    for (const [ev, fn] of pairs) {
      world.off(ev, fn);
    }
  });
}
