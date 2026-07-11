import { agentPlayVerbose } from "./agent-play-debug.js";
import { buildPlayerChainFanoutNotify } from "./player-chain/index.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type {
  SessionStore,
  SnapshotMutationFanoutItem,
} from "./session-store.js";

export type RedisFanoutItem = SnapshotMutationFanoutItem;

let redisWorldIoChain: Promise<void> = Promise.resolve();

export function runExclusiveRedisWorldIo<T>(fn: () => Promise<T>): Promise<T> {
  const p = redisWorldIoChain.then(fn, fn);
  redisWorldIoChain = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}

export async function publishSnapshotFanout(
  store: SessionStore,
  input: {
    prev: PreviewSnapshotJson | null;
    next: PreviewSnapshotJson;
    rev: number;
    merkleRootHex: string;
    merkleLeafCount: number;
    fanout: RedisFanoutItem[];
  }
): Promise<void> {
  const playerChainNotify = buildPlayerChainFanoutNotify({
    prev: input.prev,
    next: input.next,
    playerChainGenesisUtf8: store.playerChainGenesis,
  });
  const options = {
    merkleRootHex: input.merkleRootHex,
    merkleLeafCount: input.merkleLeafCount,
    ...(playerChainNotify !== undefined ? { playerChainNotify } : {}),
  };
  agentPlayVerbose("world-redis-sync", "publishSnapshotFanout", {
    rev: input.rev,
    merkleLeafCount: input.merkleLeafCount,
    fanoutEventCount: input.fanout.length,
    playerChainNotifyNodeCount:
      playerChainNotify !== undefined ? playerChainNotify.nodes.length : 0,
  });
  for (const item of input.fanout) {
    await store.publishWorldFanout(
      input.rev,
      item.event,
      item.data,
      options
    );
  }
}

export async function persistSnapshotAndFanout(
  store: SessionStore,
  snapshot: PreviewSnapshotJson,
  fanout: RedisFanoutItem[]
): Promise<void> {
  const prev = await store.getSnapshotJson();
  const { rev, merkleRootHex, merkleLeafCount } =
    await store.persistSnapshotReturningRev(snapshot);
  await publishSnapshotFanout(store, {
    prev,
    next: snapshot,
    rev,
    merkleRootHex,
    merkleLeafCount,
    fanout,
  });
}
