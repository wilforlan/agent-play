import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { PLAYER_ADDED_EVENT } from "@/server/agent-play/play-transport";
import { runRedisBackedWorldMutation } from "@/server/agent-play/world-mutation-pipeline";
import { getPlayWorld, getRedisSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import type { RegisteredPlayer } from "@/server/agent-play/play-world";

type AssistToolIn = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

function parseAssistTools(raw: unknown): AssistToolIn[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AssistToolIn[] = [];
  for (const x of raw) {
    if (typeof x !== "object" || x === null) continue;
    const o = x as Record<string, unknown>;
    if (typeof o.name !== "string") continue;
    const description =
      typeof o.description === "string" ? o.description : "";
    const parameters =
      typeof o.parameters === "object" &&
      o.parameters !== null &&
      !Array.isArray(o.parameters)
        ? (o.parameters as Record<string, unknown>)
        : {};
    out.push({ name: o.name, description, parameters });
  }
  return out.length > 0 ? out : undefined;
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST players", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    agentPlayVerbose("api", "players rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "players rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const store = getRedisSessionStore();
  const body = (await req.json()) as {
    name?: unknown;
    type?: unknown;
    agent?: unknown;
    apiKey?: unknown;
    agentId?: unknown;
  };
  if (
    typeof body.name !== "string" ||
    typeof body.type !== "string" ||
    body.agent === null ||
    typeof body.agent !== "object"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const agent = body.agent as {
    type?: unknown;
    toolNames?: unknown;
    assistTools?: unknown;
  };
  if (
    agent.type !== "langchain" ||
    !Array.isArray(agent.toolNames) ||
    !agent.toolNames.every((x): x is string => typeof x === "string")
  ) {
    return Response.json({ error: "invalid agent" }, { status: 400 });
  }
  const assistTools = parseAssistTools(agent.assistTools);
  const addInput = {
    name: body.name,
    type: body.type,
    agent: {
      type: "langchain" as const,
      toolNames: agent.toolNames,
      ...(assistTools !== undefined ? { assistTools } : {}),
    },
    apiKey:
      typeof body.apiKey === "string" && body.apiKey.length > 0
        ? body.apiKey
        : undefined,
    agentId:
      typeof body.agentId === "string" && body.agentId.length > 0
        ? body.agentId
        : undefined,
  };
  try {
    let registered: RegisteredPlayer | undefined;
    if (store !== null) {
      await runRedisBackedWorldMutation({
        sid,
        world,
        store,
        mutate: async () => {
          const reg = await world.withMutedRedisFanoutAsync(async () =>
            world.addPlayer(addInput)
          );
          registered = reg;
          const row = world
            .getSnapshotJson()
            .players.find((r) => r.playerId === reg.id);
          if (row === undefined) {
            throw new Error("addPlayer: snapshot row missing after add");
          }
          return [{ event: PLAYER_ADDED_EVENT, data: { player: row } }];
        },
      });
    } else {
      registered = await world.addPlayer(addInput);
    }
    if (registered === undefined) {
      throw new Error("addPlayer: no result");
    }
    agentPlayVerbose("api", "players ok", { playerId: registered.id });
    return Response.json({
      playerId: registered.id,
      previewUrl: registered.previewUrl,
      structures: registered.structures,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "players error", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
