/**
 * Parses **`playerChainNotify`** envelopes and merges {@link PlayerChainNodeResponse} slices into {@link AgentPlaySnapshot} (pure functions + fetch ordering for serialized RPC).
 */

import type {
  AgentPlaySnapshot,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapMcpOccupant,
  PlayerChainFanoutNotify,
  PlayerChainNotifyNodeRef,
  PlayerChainNodeResponse,
} from "../public-types.js";
import {
  parseAgentOccupantRow,
  parseMcpOccupantRow,
} from "./parse-occupant-row.js";
import {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
} from "./world-chain-keys.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stableOccupantSortKey(
  occ: AgentPlayWorldMapAgentOccupant | AgentPlayWorldMapMcpOccupant
): string {
  if (occ.kind === "agent") {
    return `agent:${occ.agentId}`;
  }
  return `mcp:${occ.id}`;
}

export function sortNodeRefsForSerializedFetch(
  nodes: ReadonlyArray<PlayerChainNotifyNodeRef>
): PlayerChainNotifyNodeRef[] {
  const removed = nodes.filter((n) => n.removed === true);
  const rest = nodes.filter((n) => n.removed !== true);
  removed.sort((a, b) => b.leafIndex - a.leafIndex);
  rest.sort((a, b) => a.leafIndex - b.leafIndex);
  return [...removed, ...rest];
}

export function parsePlayerChainFanoutNotify(
  raw: unknown
): PlayerChainFanoutNotify | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  if (typeof raw.updatedAt !== "string" || raw.updatedAt.length === 0) {
    return undefined;
  }
  if (!Array.isArray(raw.nodes)) {
    return undefined;
  }
  const nodes: PlayerChainNotifyNodeRef[] = [];
  for (const row of raw.nodes) {
    if (!isRecord(row)) {
      return undefined;
    }
    if (typeof row.stableKey !== "string" || row.stableKey.length === 0) {
      return undefined;
    }
    if (typeof row.leafIndex !== "number" || !Number.isFinite(row.leafIndex)) {
      return undefined;
    }
    const ref: PlayerChainNotifyNodeRef = {
      stableKey: row.stableKey,
      leafIndex: row.leafIndex,
    };
    if (row.removed === true) {
      ref.removed = true;
    }
    if (typeof row.updatedAt === "string" && row.updatedAt.length > 0) {
      ref.updatedAt = row.updatedAt;
    }
    nodes.push(ref);
  }
  return { updatedAt: raw.updatedAt, nodes };
}

export function parsePlayerChainFanoutNotifyFromSsePayload(
  sseData: unknown
): PlayerChainFanoutNotify | undefined {
  if (!isRecord(sseData)) {
    return undefined;
  }
  return parsePlayerChainFanoutNotify(sseData.playerChainNotify);
}

export function parsePlayerChainNodeRpcBody(json: unknown): PlayerChainNodeResponse {
  if (!isRecord(json) || !isRecord(json.node)) {
    throw new Error("getPlayerChainNode: invalid response shape");
  }
  const n = json.node;
  if (n.kind === "genesis") {
    if (
      n.stableKey !== PLAYER_CHAIN_GENESIS_STABLE_KEY ||
      typeof n.text !== "string"
    ) {
      throw new Error("getPlayerChainNode: invalid genesis node");
    }
    return {
      kind: "genesis",
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
      text: n.text,
    };
  }
  if (n.kind === "header") {
    if (
      n.stableKey !== PLAYER_CHAIN_HEADER_STABLE_KEY ||
      typeof n.sid !== "string"
    ) {
      throw new Error("getPlayerChainNode: invalid header node");
    }
    const b = n.bounds;
    if (!isRecord(b)) {
      throw new Error("getPlayerChainNode: invalid header bounds");
    }
    const { minX, minY, maxX, maxY } = b;
    if (
      typeof minX !== "number" ||
      typeof minY !== "number" ||
      typeof maxX !== "number" ||
      typeof maxY !== "number"
    ) {
      throw new Error("getPlayerChainNode: invalid header bounds");
    }
    return {
      kind: "header",
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
      sid: n.sid,
      bounds: { minX, minY, maxX, maxY },
    };
  }
  if (n.kind !== "occupant") {
    throw new Error("getPlayerChainNode: unknown node kind");
  }
  if (typeof n.stableKey !== "string" || n.stableKey.length === 0) {
    throw new Error("getPlayerChainNode: invalid occupant stableKey");
  }
  if (n.removed === true) {
    return { kind: "occupant", stableKey: n.stableKey, removed: true };
  }
  const occ = n.occupant;
  if (!isRecord(occ) || (occ.kind !== "agent" && occ.kind !== "mcp")) {
    throw new Error("getPlayerChainNode: invalid occupant payload");
  }
  const occupant =
    occ.kind === "agent"
      ? parseAgentOccupantRow(occ)
      : parseMcpOccupantRow(occ);
  return {
    kind: "occupant",
    stableKey: n.stableKey,
    removed: false,
    occupant,
  };
}

export function mergeSnapshotWithPlayerChainNode(
  snapshot: AgentPlaySnapshot,
  node: PlayerChainNodeResponse
): AgentPlaySnapshot {
  if (node.kind === "genesis") {
    return snapshot;
  }
  if (node.kind === "header") {
    return {
      ...snapshot,
      sid: node.sid,
      worldMap: {
        ...snapshot.worldMap,
        bounds: node.bounds,
      },
    };
  }
  if (node.removed === true) {
    return {
      ...snapshot,
      worldMap: {
        ...snapshot.worldMap,
        occupants: snapshot.worldMap.occupants.filter(
          (o) => stableOccupantSortKey(o) !== node.stableKey
        ),
      },
    };
  }
  if (node.removed !== false) {
    throw new Error("mergeSnapshotWithPlayerChainNode: invalid occupant node");
  }
  const occ = node.occupant;
  const key = stableOccupantSortKey(occ);
  const occupants = snapshot.worldMap.occupants.filter(
    (o) => stableOccupantSortKey(o) !== key
  );
  return {
    ...snapshot,
    worldMap: {
      ...snapshot.worldMap,
      occupants: [...occupants, occ],
    },
  };
}
