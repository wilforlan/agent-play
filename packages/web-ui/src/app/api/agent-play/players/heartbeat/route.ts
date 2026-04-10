import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  const rawSid = req.nextUrl.searchParams.get("sid");
  if (rawSid === null || rawSid.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = rawSid.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const connectionId =
    typeof body.connectionId === "string" ? body.connectionId.trim() : "";
  const leaseTtlSeconds =
    typeof body.leaseTtlSeconds === "number" && Number.isFinite(body.leaseTtlSeconds)
      ? body.leaseTtlSeconds
      : undefined;
  if (playerId.length === 0 || connectionId.length === 0) {
    return Response.json(
      { error: "playerId and connectionId are required" },
      { status: 400 }
    );
  }

  const world = await getPlayWorld();
  try {
    await world.heartbeatPlayerConnection({
      playerId,
      connectionId,
      leaseTtlSeconds,
    });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
