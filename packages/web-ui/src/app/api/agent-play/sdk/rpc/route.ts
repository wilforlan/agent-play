import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";
import type { Journey } from "@/server/agent-play/@types/world";

function requireSid(req: NextRequest): string | null {
  const sid = req.nextUrl.searchParams.get("sid");
  if (sid === null || sid.length === 0) return null;
  return sid;
}

export async function POST(req: NextRequest) {
  const sid = requireSid(req);
  if (sid === null) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }

  const body = (await req.json()) as {
    op?: unknown;
    payload?: unknown;
  };
  if (typeof body.op !== "string") {
    return Response.json({ error: "missing op" }, { status: 400 });
  }

  try {
    switch (body.op) {
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
        world.recordInteraction({
          playerId: p.playerId,
          role: p.role as "user" | "assistant" | "tool",
          text: p.text,
        });
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
        world.recordJourney(p.playerId, p.journey as Journey);
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
        world.syncPlayerStructuresFromTools(
          p.playerId,
          p.toolNames.filter((x): x is string => typeof x === "string")
        );
        return Response.json({ ok: true });
      }
      case "ingestInvokeResult": {
        const p = body.payload as {
          playerId?: unknown;
          invokeResult?: unknown;
        };
        if (typeof p.playerId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        world.ingestInvokeResult(p.playerId, p.invokeResult);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "unknown op" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
