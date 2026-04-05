/**
 * Redis pub/sub envelope for world-scoped events (`agent-play:{hostId}:world:events`).
 *
 * Optional {@link WorldFanoutMessage.playerChainNotify} is parsed with
 * {@link parsePlayerChainFanoutNotify}; invalid notify JSON is omitted without failing the message.
 */
import { agentPlayDebug } from "./agent-play-debug.js";
import {
  parsePlayerChainFanoutNotify,
  type PlayerChainFanoutNotify,
} from "./player-chain/index.js";

/** Redis channel name for cross-process fanout. */
export function worldFanoutChannel(hostId: string): string {
  return `agent-play:${hostId}:world:events`;
}

export type WorldFanoutMessage = {
  rev: number;
  event: string;
  data: unknown;
  merkleRootHex?: string;
  merkleLeafCount?: number;
  playerChainNotify?: PlayerChainFanoutNotify;
};

/**
 * Parses one Redis message body. Returns `null` for invalid JSON or missing `rev`/`event`.
 * `playerChainNotify` must satisfy {@link parsePlayerChainFanoutNotify} or it is dropped.
 */
export function parseWorldFanoutMessage(raw: string): WorldFanoutMessage | null {
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) return null;
    const o = p as Record<string, unknown>;
    if (typeof o.rev !== "number" || typeof o.event !== "string")
      return null;
    const out: WorldFanoutMessage = {
      rev: o.rev,
      event: o.event,
      data: o.data,
    };
    if (typeof o.merkleRootHex === "string" && o.merkleRootHex.length > 0) {
      out.merkleRootHex = o.merkleRootHex;
    }
    if (
      typeof o.merkleLeafCount === "number" &&
      Number.isFinite(o.merkleLeafCount)
    ) {
      out.merkleLeafCount = o.merkleLeafCount;
    }
    if (o.playerChainNotify !== undefined) {
      const notify = parsePlayerChainFanoutNotify(o.playerChainNotify);
      if (notify !== undefined) {
        out.playerChainNotify = notify;
      } else {
        agentPlayDebug("player-chain-fanout", "parseWorldFanoutMessage: dropped invalid playerChainNotify", {
          rev: o.rev,
          event: o.event,
        });
      }
    }
    return out;
  } catch {
    agentPlayDebug("player-chain-fanout", "parseWorldFanoutMessage: invalid JSON");
    return null;
  }
}
