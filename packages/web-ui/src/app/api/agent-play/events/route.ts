import { NextRequest } from "next/server";
import { serializeWorldJourneyUpdate } from "@/server/agent-play/preview-serialize";
import type { WorldJourneyUpdate } from "@/server/agent-play/@types/world";
import { getPlayWorld } from "@/server/get-world";
import {
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "@/server/agent-play/play-transport";

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (sid === null || sid.length === 0) {
    return new Response(JSON.stringify({ error: "missing sid" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    return new Response(JSON.stringify({ error: "invalid sid" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      const onJourney = (payload: unknown) => {
        const update = payload as WorldJourneyUpdate;
        send(WORLD_JOURNEY_EVENT, serializeWorldJourneyUpdate(update));
      };
      const onPlayer = (payload: unknown) => {
        send(PLAYER_ADDED_EVENT, payload);
      };
      const onStructures = (payload: unknown) => {
        send(WORLD_STRUCTURES_EVENT, payload);
      };
      const onInteraction = (payload: unknown) => {
        send(WORLD_INTERACTION_EVENT, payload);
      };
      const onAgentSignal = (payload: unknown) => {
        send(WORLD_AGENT_SIGNAL_EVENT, payload);
      };

      world.on(WORLD_JOURNEY_EVENT, onJourney);
      world.on(PLAYER_ADDED_EVENT, onPlayer);
      world.on(WORLD_STRUCTURES_EVENT, onStructures);
      world.on(WORLD_INTERACTION_EVENT, onInteraction);
      world.on(WORLD_AGENT_SIGNAL_EVENT, onAgentSignal);

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        world.off(WORLD_JOURNEY_EVENT, onJourney);
        world.off(PLAYER_ADDED_EVENT, onPlayer);
        world.off(WORLD_STRUCTURES_EVENT, onStructures);
        world.off(WORLD_INTERACTION_EVENT, onInteraction);
        world.off(WORLD_AGENT_SIGNAL_EVENT, onAgentSignal);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
