import { NextRequest } from "next/server";
import {
  agentPlayVerbose,
  isAgentPlayVerboseEnabled,
} from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import type { Journey } from "@/server/agent-play/@types/world";
import { readResolvedSnapshot } from "@/server/agent-play/read-resolved-snapshot";
import { readPlayerChainNode } from "@/server/agent-play/read-player-chain-node";
import { getPlayWorld, getSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

function requireSid(req: NextRequest): string | null {
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) return null;
  return raw.trim();
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST sdk/rpc", req);
  let body: { op?: unknown; payload?: unknown };
  try {
    body = (await req.json()) as { op?: unknown; payload?: unknown };
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.op !== "string") {
    return Response.json({ error: "missing op" }, { status: 400 });
  }
  agentPlayVerbose("api", "sdk/rpc op", { op: body.op });

  const world = await getPlayWorld();
  const store = getSessionStore();

  try {
    if (body.op === "getWorldSnapshot") {
      const snap = await readResolvedSnapshot({
        sid: store.getSessionId(),
        store,
      });
      if (isAgentPlayVerboseEnabled()) {
        agentPlayVerbose("api", "getWorldSnapshot", snap);
      }
      return Response.json({ snapshot: snap });
    }

    // Incremental sync: one player-chain node from the live snapshot (see read-player-chain-node).
    if (body.op === "getPlayerChainNode") {
      const p = body.payload as { stableKey?: unknown };
      if (typeof p.stableKey !== "string" || p.stableKey.trim().length === 0) {
        return Response.json({ error: "invalid payload" }, { status: 400 });
      }
      const node = await readPlayerChainNode({
        sid: store.getSessionId(),
        store,
        stableKey: p.stableKey.trim(),
      });
      if (node === null) {
        return Response.json({ error: "unknown stableKey" }, { status: 400 });
      }
      return Response.json({ node });
    }

    const sid = requireSid(req);
    if (sid === null) {
      agentPlayVerbose("api", "sdk/rpc rejected", { reason: "missing sid" });
      return Response.json({ error: "missing sid" }, { status: 400 });
    }
    if (!(await validateAgentPlaySession(sid))) {
      agentPlayVerbose("api", "sdk/rpc rejected", { reason: "invalid sid" });
      return Response.json({ error: "invalid sid" }, { status: 403 });
    }

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
        const riPlayerId = p.playerId;
        const riRole = p.role as "user" | "assistant" | "tool";
        const riText = p.text;
        if (riText.trim().length === 0) {
          return Response.json({ ok: true });
        }
        await world.recordInteraction({
          playerId: riPlayerId,
          role: riRole,
          text: riText,
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
        const rjPlayerId = p.playerId;
        const rjJourney = p.journey as Journey;
        await world.recordJourney(rjPlayerId, rjJourney);
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
