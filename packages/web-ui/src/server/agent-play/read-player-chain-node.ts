/**
 * Resolves one player-chain “node” for RPC `getPlayerChainNode`: genesis text, header slice,
 * or occupant row / removal, always derived from the same {@link readResolvedSnapshot} as
 * `getWorldSnapshot` (no separate Redis blob per key yet).
 *
 * Enable `AGENT_PLAY_VERBOSE=1` for per-request kind + stableKey logs (no occupant bodies).
 */
import { agentPlayVerbose } from "./agent-play-debug.js";
import {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
  stableOccupantSortKey,
} from "./player-chain/index.js";
import type {
  PreviewSnapshotJson,
  PreviewWorldMapOccupantJson,
} from "./preview-serialize.js";
import { readResolvedSnapshot } from "./read-resolved-snapshot.js";
import type { WorldSessionStore } from "./world-session-store.js";

/** Discriminated union returned by {@link readPlayerChainNode} and the SDK RPC. */
export type PlayerChainNodeResponse =
  | {
      kind: "genesis";
      stableKey: typeof PLAYER_CHAIN_GENESIS_STABLE_KEY;
      text: string;
    }
  | {
      kind: "header";
      stableKey: typeof PLAYER_CHAIN_HEADER_STABLE_KEY;
      sid: string;
      bounds: PreviewSnapshotJson["worldMap"]["bounds"];
    }
  | {
      kind: "occupant";
      stableKey: string;
      removed: true;
    }
  | {
      kind: "occupant";
      stableKey: string;
      removed: false;
      occupant: PreviewWorldMapOccupantJson;
    };

/**
 * Loads the canonical snapshot for `sid` and returns the slice for `stableKey`.
 * Empty `stableKey` after trim yields `null`.
 */
export async function readPlayerChainNode(options: {
  sid: string;
  store: WorldSessionStore;
  stableKey: string;
}): Promise<PlayerChainNodeResponse | null> {
  const stableKey = options.stableKey.trim();
  if (stableKey.length === 0) {
    agentPlayVerbose("player-chain-rpc", "readPlayerChainNode: empty stableKey", {
      sid: options.sid,
    });
    return null;
  }
  const snapshot = await readResolvedSnapshot({
    sid: options.sid,
    store: options.store,
  });
  const genesisTrimmed = options.store.playerChainGenesis.trim();
  if (stableKey === PLAYER_CHAIN_GENESIS_STABLE_KEY) {
    agentPlayVerbose("player-chain-rpc", "readPlayerChainNode: genesis", {
      sid: options.sid,
      textLength: genesisTrimmed.length,
    });
    return {
      kind: "genesis",
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
      text: genesisTrimmed,
    };
  }
  if (stableKey === PLAYER_CHAIN_HEADER_STABLE_KEY) {
    agentPlayVerbose("player-chain-rpc", "readPlayerChainNode: header", {
      sid: options.sid,
      resolvedSid: snapshot.sid,
    });
    return {
      kind: "header",
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
      sid: snapshot.sid,
      bounds: snapshot.worldMap.bounds,
    };
  }
  const occ = snapshot.worldMap.occupants.find(
    (o) => stableOccupantSortKey(o) === stableKey
  );
  if (occ === undefined) {
    agentPlayVerbose("player-chain-rpc", "readPlayerChainNode: occupant removed", {
      sid: options.sid,
      stableKey,
    });
    return { kind: "occupant", stableKey, removed: true };
  }
  agentPlayVerbose("player-chain-rpc", "readPlayerChainNode: occupant present", {
    sid: options.sid,
    stableKey,
    occupantKind: occ.kind,
  });
  return { kind: "occupant", stableKey, removed: false, occupant: occ };
}
