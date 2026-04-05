import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld, subscribeWorldFanout } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import type { WorldFanoutMessage } from "@/server/agent-play/redis-world-fanout";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET events (SSE)", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    agentPlayVerbose("api", "events rejected", { reason: "missing sid" });
    return new Response(JSON.stringify({ error: "missing sid" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "events rejected", { reason: "invalid sid" });
    return new Response(JSON.stringify({ error: "invalid sid" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  await getPlayWorld();
  agentPlayVerbose("api", "events SSE stream opened", {
    fanout: "world",
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      let lastFanoutKey = "";
      const onRedisFanout = (msg: WorldFanoutMessage) => {
        const payload =
          typeof msg.data === "object" &&
          msg.data !== null &&
          !Array.isArray(msg.data)
            ? {
                ...(msg.data as Record<string, unknown>),
                rev: msg.rev,
                ...(msg.merkleRootHex !== undefined
                  ? { merkleRootHex: msg.merkleRootHex }
                  : {}),
                ...(msg.merkleLeafCount !== undefined
                  ? { merkleLeafCount: msg.merkleLeafCount }
                  : {}),
                ...(msg.playerChainNotify !== undefined
                  ? { playerChainNotify: msg.playerChainNotify }
                  : {}),
              }
            : {
                payload: msg.data,
                rev: msg.rev,
                ...(msg.merkleRootHex !== undefined
                  ? { merkleRootHex: msg.merkleRootHex }
                  : {}),
                ...(msg.merkleLeafCount !== undefined
                  ? { merkleLeafCount: msg.merkleLeafCount }
                  : {}),
                ...(msg.playerChainNotify !== undefined
                  ? { playerChainNotify: msg.playerChainNotify }
                  : {}),
              };
        const dedupeKey = `${String(msg.rev)}\0${msg.event}\0${JSON.stringify(payload)}`;
        if (dedupeKey === lastFanoutKey) return;
        lastFanoutKey = dedupeKey;
        send(msg.event, payload);
      };

      const unsubscribeFanout = subscribeWorldFanout(onRedisFanout);

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsubscribeFanout();
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
