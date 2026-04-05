import { agentPlayVerbose } from "./agent-play-debug.js";
import { buildPlayerChainFanoutNotify } from "./player-chain/index.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { WorldFanoutOptions, WorldSessionStore } from "./world-session-store.js";

export type RedisFanoutItem = {
  event: string;
  data: unknown;
};

let redisWorldIoChain: Promise<void> = Promise.resolve();

export function runExclusiveRedisWorldIo<T>(fn: () => Promise<T>): Promise<T> {
  const p = redisWorldIoChain.then(fn, fn);
  redisWorldIoChain = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}

export async function persistSnapshotAndFanout(
  store: WorldSessionStore,
  snapshot: PreviewSnapshotJson,
  fanout: RedisFanoutItem[]
): Promise<void> {
  const prev = await store.getSnapshotJson();
  const { rev, merkleRootHex, merkleLeafCount } =
    await store.persistSnapshotReturningRev(snapshot);
  const playerChainNotify = buildPlayerChainFanoutNotify({
    prev,
    next: snapshot,
    playerChainGenesisUtf8: store.playerChainGenesis,
  });
  const options: WorldFanoutOptions = {
    merkleRootHex,
    merkleLeafCount,
    ...(playerChainNotify !== undefined ? { playerChainNotify } : {}),
  };
  agentPlayVerbose("world-redis-sync", "persistSnapshotAndFanout", {
    rev,
    merkleLeafCount,
    fanoutEventCount: fanout.length,
    playerChainNotifyNodeCount:
      playerChainNotify !== undefined ? playerChainNotify.nodes.length : 0,
  });
  for (const item of fanout) {
    await store.publishWorldFanout(rev, item.event, item.data, options);
  }
}
