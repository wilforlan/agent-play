/**
 * Player chain: deterministic Merkle tree over snapshot-derived leaves (genesis, header, occupants).
 *
 * Used for `persistSnapshotReturningRev` metadata, Redis `player-chain:leaves`, fanout
 * `playerChainNotify`, and client merge strategies. Leaf order matches
 * `buildLeafEntriesFromSnapshot`; internal node hashing uses {@link digestPair}.
 *
 * Diagnostics: set `AGENT_PLAY_VERBOSE=1` or `AGENT_PLAY_DEBUG=1` for structured logs
 * (stable keys and counts only, not full occupant JSON).
 */
import { createHash } from "node:crypto";
import {
  agentPlayDebug,
  agentPlayVerbose,
} from "../agent-play-debug.js";
import type {
  PreviewSnapshotJson,
  PreviewWorldMapOccupantJson,
} from "../preview-serialize.js";

const LEAF_DOMAIN = "wilforlan:player-chain:leaf\0";
const NODE_DOMAIN = "wilforlan:player-chain:node\0";

const PLAYER_CHAIN_LOG_MAX_KEYS = 24;

function truncateKeys(keys: readonly string[], max: number): string[] {
  if (keys.length <= max) {
    return [...keys];
  }
  return [...keys.slice(0, max), `…+${keys.length - max} more`];
}

/** Stable id for the genesis leaf (trimmed `.root` / `AGENT_PLAY_ROOT_FILE` bytes). */
export const PLAYER_CHAIN_GENESIS_STABLE_KEY = "__genesis__";
/** Stable id for the session header leaf (`sid` + `worldMap.bounds`). */
export const PLAYER_CHAIN_HEADER_STABLE_KEY = "__header__";

/**
 * JSON serialization with sorted object keys so occupant multiset hashing is order-invariant
 * at the object level (occupant list order is normalized separately).
 */
export function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }
  if (t !== "object") {
    return JSON.stringify(String(value));
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Leaf hash: `SHA256(LEAF_DOMAIN ‖ payloadUtf8)`, hex. */
export function digestLeaf(payloadUtf8: string): string {
  return createHash("sha256")
    .update(LEAF_DOMAIN + payloadUtf8, "utf8")
    .digest("hex");
}

/**
 * Internal Merkle node: hashes two child digests (hex strings as UTF-8) with {@link NODE_DOMAIN}.
 */
export function digestPair(leftHex: string, rightHex: string): string {
  return createHash("sha256")
    .update(NODE_DOMAIN + leftHex + rightHex, "utf8")
    .digest("hex");
}

/**
 * Binary Merkle reduction left-to-right; odd breadth duplicates the last sibling.
 * Empty input yields `digestLeaf("")`.
 */
export function buildMerkleRootHex(
  leafDigestsHex: readonly string[]
): string {
  if (leafDigestsHex.length === 0) {
    return digestLeaf("");
  }
  let level = [...leafDigestsHex];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      if (left === undefined) {
        break;
      }
      const right = level[i + 1] ?? left;
      next.push(digestPair(left, right));
    }
    level = next;
  }
  const root = level[0];
  if (root === undefined) {
    return digestLeaf("");
  }
  return root;
}

/** One leaf in chain order: human-readable `stableKey` and digest for that leaf’s canonical payload. */
export type PlayerChainLeafEntry = {
  stableKey: string;
  leafDigestHex: string;
};

/** Session-store / fanout metadata persisted beside `snapshotRev`. */
export type PlayerChainDigest = {
  merkleRootHex: string;
  merkleLeafCount: number;
};

/**
 * Canonical stable key for an occupant row: `human:{id}`, `agent:{agentId}`, or `mcp:{id}`.
 * Matches sort order for leaves after genesis and header.
 */
export function stableOccupantSortKey(
  occ: PreviewWorldMapOccupantJson
): string {
  if (occ.kind === "human") {
    return `human:${occ.id}`;
  }
  if (occ.kind === "agent") {
    return `agent:${occ.agentId}`;
  }
  return `mcp:${occ.id}`;
}

/**
 * Ordered leaves: `__genesis__`, `__header__`, then occupants sorted by {@link stableOccupantSortKey}.
 * Each entry’s digest is `digestLeaf(payload)` for the canonical UTF-8 payload.
 */
export function buildLeafEntriesFromSnapshot(
  snapshot: PreviewSnapshotJson,
  playerChainGenesisUtf8: string
): PlayerChainLeafEntry[] {
  const genesisTrimmed = playerChainGenesisUtf8.trim();
  const headerPayload = stableStringify({
    v: 1,
    sid: snapshot.sid,
    bounds: snapshot.worldMap.bounds,
  });
  const entries: PlayerChainLeafEntry[] = [
    {
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
      leafDigestHex: digestLeaf(genesisTrimmed),
    },
    {
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
      leafDigestHex: digestLeaf(headerPayload),
    },
  ];
  const sorted = [...snapshot.worldMap.occupants].sort((a, b) =>
    stableOccupantSortKey(a).localeCompare(stableOccupantSortKey(b))
  );
  for (const occ of sorted) {
    entries.push({
      stableKey: stableOccupantSortKey(occ),
      leafDigestHex: digestLeaf(stableStringify(occ)),
    });
  }
  return entries;
}

/** Redis `HSET` field map: stableKey → leaf digest hex (full map replace on persist). */
export function buildLeafFieldMapFromSnapshot(
  snapshot: PreviewSnapshotJson,
  playerChainGenesisUtf8: string
): Record<string, string> {
  const entries = buildLeafEntriesFromSnapshot(
    snapshot,
    playerChainGenesisUtf8
  );
  return Object.fromEntries(
    entries.map((e) => [e.stableKey, e.leafDigestHex])
  );
}

/** Redis hash key for per-leaf digests: `agent-play:{hostId}:player-chain:leaves`. */
export function playerChainLeavesKey(hostId: string): string {
  return `agent-play:${hostId}:player-chain:leaves`;
}

/**
 * Computes Merkle root and leaf count for a snapshot (session metadata + fanout).
 */
export function buildPlayerChainFromSnapshot(
  snapshot: PreviewSnapshotJson,
  playerChainGenesisUtf8: string
): PlayerChainDigest {
  const entries = buildLeafEntriesFromSnapshot(
    snapshot,
    playerChainGenesisUtf8
  );
  const digests = entries.map((e) => e.leafDigestHex);
  const out = {
    merkleRootHex: buildMerkleRootHex(digests),
    merkleLeafCount: digests.length,
  };
  agentPlayVerbose("player-chain", "buildPlayerChainFromSnapshot", {
    sid: snapshot.sid,
    merkleLeafCount: out.merkleLeafCount,
    merkleRootHexPrefix: out.merkleRootHex.slice(0, 16),
  });
  return out;
}

export type PlayerChainDiff = {
  updates: PlayerChainLeafEntry[];
  removedKeys: string[];
};

/**
 * Compares previous and next leaf digest maps. `updates` includes new keys and changed digests;
 * `removedKeys` are stable keys present in `prev` but not in `next`.
 */
export function diffPlayerChainLeaves(
  prev: PreviewSnapshotJson | null,
  next: PreviewSnapshotJson,
  playerChainGenesisUtf8: string
): PlayerChainDiff {
  const prevMap = new Map<string, string>(
    prev === null
      ? []
      : buildLeafEntriesFromSnapshot(prev, playerChainGenesisUtf8).map(
          (e) => [e.stableKey, e.leafDigestHex]
        )
  );
  const nextEntries = buildLeafEntriesFromSnapshot(
    next,
    playerChainGenesisUtf8
  );
  const nextMap = new Map(
    nextEntries.map((e) => [e.stableKey, e.leafDigestHex])
  );
  const removedKeys: string[] = [];
  for (const k of prevMap.keys()) {
    if (!nextMap.has(k)) {
      removedKeys.push(k);
    }
  }
  const updates: PlayerChainLeafEntry[] = [];
  for (const [k, v] of nextMap) {
    if (prevMap.get(k) !== v) {
      updates.push({ stableKey: k, leafDigestHex: v });
    }
  }
  return { updates, removedKeys };
}

/** One row in `playerChainNotify.nodes` for fanout / SSE (no digests on the wire). */
export type PlayerChainNotifyNodeRef = {
  stableKey: string;
  leafIndex: number;
  removed?: boolean;
  updatedAt?: string;
};

/** Slim fanout / SSE attachment: clients fetch full rows via `getPlayerChainNode` using `stableKey`. */
export type PlayerChainFanoutNotify = {
  updatedAt: string;
  nodes: PlayerChainNotifyNodeRef[];
};

/**
 * Builds the slim fanout payload clients use with `getPlayerChainNode` RPC.
 *
 * - Runs {@link diffPlayerChainLeaves}; if empty, returns `undefined` (no `playerChainNotify` on fanout).
 * - Removal refs use `leafIndex` from **previous** snapshot order (sorted descending in output).
 * - Update refs use `leafIndex` from **next** snapshot order (sorted ascending after removals).
 * - All refs share the same `updatedAt` ISO timestamp unless overridden in `options`.
 */
export function buildPlayerChainFanoutNotify(options: {
  prev: PreviewSnapshotJson | null;
  next: PreviewSnapshotJson;
  playerChainGenesisUtf8: string;
  updatedAt?: string;
}): PlayerChainFanoutNotify | undefined {
  const { prev, next, playerChainGenesisUtf8 } = options;
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  const diff = diffPlayerChainLeaves(prev, next, playerChainGenesisUtf8);
  if (diff.removedKeys.length === 0 && diff.updates.length === 0) {
    agentPlayVerbose("player-chain", "buildPlayerChainFanoutNotify: empty diff, no notify", {
      nextSid: next.sid,
    });
    return undefined;
  }
  agentPlayVerbose("player-chain", "buildPlayerChainFanoutNotify: diff summary", {
    nextSid: next.sid,
    prevWasNull: prev === null,
    removedCount: diff.removedKeys.length,
    updateCount: diff.updates.length,
    removedKeys: truncateKeys(diff.removedKeys, PLAYER_CHAIN_LOG_MAX_KEYS),
    updateKeys: truncateKeys(
      diff.updates.map((u) => u.stableKey),
      PLAYER_CHAIN_LOG_MAX_KEYS
    ),
  });
  const nextEntries = buildLeafEntriesFromSnapshot(
    next,
    playerChainGenesisUtf8
  );
  const keyToNextIndex = new Map(
    nextEntries.map((e, i) => [e.stableKey, i])
  );
  const prevEntries =
    prev === null
      ? []
      : buildLeafEntriesFromSnapshot(prev, playerChainGenesisUtf8);
  const keyToPrevIndex = new Map(
    prevEntries.map((e, i) => [e.stableKey, i])
  );
  const removedNodes: PlayerChainNotifyNodeRef[] = diff.removedKeys.map(
    (stableKey) => ({
      stableKey,
      leafIndex: keyToPrevIndex.get(stableKey) ?? 0,
      removed: true,
      updatedAt,
    })
  );
  removedNodes.sort((a, b) => b.leafIndex - a.leafIndex);
  const updateNodes: PlayerChainNotifyNodeRef[] = diff.updates.map((u) => ({
    stableKey: u.stableKey,
    leafIndex: keyToNextIndex.get(u.stableKey) ?? 0,
    removed: false,
    updatedAt,
  }));
  updateNodes.sort((a, b) => a.leafIndex - b.leafIndex);
  const notify: PlayerChainFanoutNotify = {
    updatedAt,
    nodes: [...removedNodes, ...updateNodes],
  };
  agentPlayVerbose("player-chain", "buildPlayerChainFanoutNotify", {
    nextSid: next.sid,
    updatedAt: notify.updatedAt,
    nodeCount: notify.nodes.length,
    removedInNotify: removedNodes.length,
    updatedInNotify: updateNodes.length,
    nodeOrder: truncateKeys(
      notify.nodes.map((n) =>
        n.removed === true ? `${n.stableKey}(rm)` : n.stableKey
      ),
      PLAYER_CHAIN_LOG_MAX_KEYS
    ),
  });
  return notify;
}

/**
 * Validates wire JSON for `playerChainNotify` (Redis fanout / nested SSE payload).
 * Returns `undefined` if shape is invalid (see debug logs for failure reason).
 */
export function parsePlayerChainFanoutNotify(
  raw: unknown
): PlayerChainFanoutNotify | undefined {
  if (typeof raw !== "object" || raw === null) {
    agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
      reason: "not_object",
    });
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.updatedAt !== "string" || o.updatedAt.length === 0) {
    agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
      reason: "missing_updatedAt",
    });
    return undefined;
  }
  const nodesRaw = o.nodes;
  if (!Array.isArray(nodesRaw)) {
    agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
      reason: "nodes_not_array",
    });
    return undefined;
  }
  const nodes: PlayerChainNotifyNodeRef[] = [];
  for (const row of nodesRaw) {
    if (typeof row !== "object" || row === null) {
      agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
        reason: "node_not_object",
      });
      return undefined;
    }
    const r = row as Record<string, unknown>;
    if (typeof r.stableKey !== "string" || r.stableKey.length === 0) {
      agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
        reason: "node_stableKey",
      });
      return undefined;
    }
    if (typeof r.leafIndex !== "number" || !Number.isFinite(r.leafIndex)) {
      agentPlayDebug("player-chain", "parsePlayerChainFanoutNotify: reject", {
        reason: "node_leafIndex",
        stableKey: r.stableKey,
      });
      return undefined;
    }
    const ref: PlayerChainNotifyNodeRef = {
      stableKey: r.stableKey,
      leafIndex: r.leafIndex,
    };
    if (r.removed === true) {
      ref.removed = true;
    }
    if (typeof r.updatedAt === "string" && r.updatedAt.length > 0) {
      ref.updatedAt = r.updatedAt;
    }
    nodes.push(ref);
  }
  const parsed: PlayerChainFanoutNotify = { updatedAt: o.updatedAt, nodes };
  agentPlayVerbose("player-chain", "parsePlayerChainFanoutNotify: ok", {
    updatedAt: parsed.updatedAt,
    nodeCount: parsed.nodes.length,
  });
  return parsed;
}
