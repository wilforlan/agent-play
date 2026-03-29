import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

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
  const body = (await req.json()) as {
    name?: unknown;
    type?: unknown;
    agent?: unknown;
    apiKey?: unknown;
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
  };
  if (
    agent.type !== "langchain" ||
    !Array.isArray(agent.toolNames) ||
    !agent.toolNames.every((x): x is string => typeof x === "string")
  ) {
    return Response.json({ error: "invalid agent" }, { status: 400 });
  }
  try {
    const registered = await world.addPlayer({
      name: body.name,
      type: body.type,
      agent: {
        type: "langchain",
        toolNames: agent.toolNames,
      },
      apiKey:
        typeof body.apiKey === "string" && body.apiKey.length > 0
          ? body.apiKey
          : undefined,
    });
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
