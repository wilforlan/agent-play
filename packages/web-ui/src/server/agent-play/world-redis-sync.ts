import type { RedisSessionStore } from "./redis-session-store.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";

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
  store: RedisSessionStore,
  snapshot: PreviewSnapshotJson,
  fanout: RedisFanoutItem[]
): Promise<void> {
  const rev = await store.persistSnapshotReturningRev(snapshot);
  for (const item of fanout) {
    await store.publishWorldFanout(rev, item.event, item.data);
  }
}

export function scheduleRedisWorldPersist(
  store: RedisSessionStore,
  getSnapshot: () => PreviewSnapshotJson,
  fanout: RedisFanoutItem[]
): Promise<void> {
  return runExclusiveRedisWorldIo(async () => {
    await persistSnapshotAndFanout(store, getSnapshot(), fanout);
  });
}
