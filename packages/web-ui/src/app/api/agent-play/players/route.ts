import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";

export async function POST(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (sid === null || sid.length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
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
    return Response.json({
      playerId: registered.id,
      previewUrl: registered.previewUrl,
      structures: registered.structures,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
