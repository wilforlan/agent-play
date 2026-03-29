import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

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
    fromPlayerId?: unknown;
    toPlayerId?: unknown;
    action?: unknown;
  };
  if (
    typeof body.fromPlayerId !== "string" ||
    typeof body.toPlayerId !== "string" ||
    typeof body.action !== "string"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const action = body.action;
  if (
    action !== "assist" &&
    action !== "chat" &&
    action !== "zone" &&
    action !== "yield"
  ) {
    return Response.json({ error: "invalid action" }, { status: 400 });
  }
  try {
    world.recordProximityAction({
      fromPlayerId: body.fromPlayerId,
      toPlayerId: body.toPlayerId,
      action,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.json(
    { ok: true },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
