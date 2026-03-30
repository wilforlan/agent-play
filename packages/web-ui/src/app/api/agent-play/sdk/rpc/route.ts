import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import type { Journey } from "@/server/agent-play/@types/world";
import {
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "@/server/agent-play/play-transport";
import { readResolvedSnapshot } from "@/server/agent-play/read-resolved-snapshot";
import { runRedisBackedWorldMutation } from "@/server/agent-play/world-mutation-pipeline";
import { getPlayWorld, getRedisSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import type { RedisFanoutItem } from "@/server/agent-play/world-redis-sync";

function requireSid(req: NextRequest): string | null {
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) return null;
  return raw.trim();
}

function journeyFanoutForPlayer(
  world: Awaited<ReturnType<typeof getPlayWorld>>,
  playerId: string
): RedisFanoutItem[] {
  const last = world.getSnapshotJson().players.find((r) => r.playerId === playerId)
    ?.lastUpdate;
  if (last === undefined) {
    return [
      {
        event: WORLD_AGENT_SIGNAL_EVENT,
        data: {
          playerId,
          kind: "journey" as const,
          data: {},
        },
      },
    ];
  }
  return [
    { event: WORLD_JOURNEY_EVENT, data: last },
    {
      event: WORLD_AGENT_SIGNAL_EVENT,
      data: {
        playerId,
        kind: "journey" as const,
        data: { stepCount: last.journey.steps.length },
      },
    },
  ];
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST sdk/rpc", req);
  const sid = requireSid(req);
  if (sid === null) {
    agentPlayVerbose("api", "sdk/rpc rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "sdk/rpc rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const store = getRedisSessionStore();

  const body = (await req.json()) as {
    op?: unknown;
    payload?: unknown;
  };
  if (typeof body.op !== "string") {
    return Response.json({ error: "missing op" }, { status: 400 });
  }
  agentPlayVerbose("api", "sdk/rpc op", { op: body.op });

  try {
    switch (body.op) {
      case "getSnapshot": {
        const snap = await readResolvedSnapshot({ sid, world, store });
        return Response.json({ snapshot: snap });
      }
      case "recordInteraction": {
        const p = body.payload as {
          playerId?: unknown;
          role?: unknown;
          text?: unknown;
        };
        if (
          typeof p.playerId !== "string" ||
          typeof p.role !== "string" ||
          typeof p.text !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const riPlayerId = p.playerId;
        const riRole = p.role as "user" | "assistant" | "tool";
        const riText = p.text;
        if (riText.trim().length === 0) {
          return Response.json({ ok: true });
        }
        if (store !== null) {
          await runRedisBackedWorldMutation({
            sid,
            world,
            store,
            mutate: async () => {
              const payload = world.withMutedRedisFanout(() =>
                world.recordInteraction({
                  playerId: riPlayerId,
                  role: riRole,
                  text: riText,
                })
              );
              if (payload === null) return [];
              return [{ event: WORLD_INTERACTION_EVENT, data: payload }];
            },
          });
        } else {
          world.recordInteraction({
            playerId: riPlayerId,
            role: riRole,
            text: riText,
          });
        }
        return Response.json({ ok: true });
      }
      case "recordJourney": {
        const p = body.payload as {
          playerId?: unknown;
          journey?: unknown;
        };
        if (typeof p.playerId !== "string" || p.journey === undefined) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const rjPlayerId = p.playerId;
        const rjJourney = p.journey as Journey;
        if (store !== null) {
          await runRedisBackedWorldMutation({
            sid,
            world,
            store,
            mutate: async () => {
              world.withMutedRedisFanout(() => {
                world.recordJourney(rjPlayerId, rjJourney);
              });
              return journeyFanoutForPlayer(world, rjPlayerId);
            },
          });
        } else {
          world.recordJourney(rjPlayerId, rjJourney);
        }
        return Response.json({ ok: true });
      }
      case "syncPlayerStructuresFromTools": {
        const p = body.payload as {
          playerId?: unknown;
          toolNames?: unknown;
        };
        if (typeof p.playerId !== "string" || !Array.isArray(p.toolNames)) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const stPlayerId = p.playerId;
        const toolNames = p.toolNames.filter(
          (x): x is string => typeof x === "string"
        );
        if (store !== null) {
          await runRedisBackedWorldMutation({
            sid,
            world,
            store,
            mutate: async () => {
              world.withMutedRedisFanout(() => {
                world.syncPlayerStructuresFromTools(stPlayerId, toolNames);
              });
              const info = world.getPlayer(stPlayerId);
              const snap = world.getSnapshotJson();
              const row = snap.players.find((r) => r.playerId === stPlayerId);
              if (info === undefined || row === undefined) return [];
              const type = snap.players.find((r) => r.playerId === stPlayerId)
                ?.type;
              const payload: {
                playerId: string;
                name: string;
                structures: (typeof row)["structures"];
                type?: string;
              } = {
                playerId: stPlayerId,
                name: info.name,
                structures: row.structures,
              };
              if (type !== undefined) payload.type = type;
              return [{ event: WORLD_STRUCTURES_EVENT, data: payload }];
            },
          });
        } else {
          world.syncPlayerStructuresFromTools(stPlayerId, toolNames);
        }
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "unknown op" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "sdk/rpc catch", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
