import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionStore } from "./session-store.js";
import {
  persistSnapshotAndFanout,
  runExclusiveRedisWorldIo,
  type RedisFanoutItem,
} from "./world-redis-sync.js";

export type { RedisFanoutItem };

export async function runStoredWorldMutation(options: {
  store: SessionStore;
  mutate: (
    snapshot: PreviewSnapshotJson | null
  ) => Promise<{ next: PreviewSnapshotJson; fanout: RedisFanoutItem[] }>;
}): Promise<void> {
  await runExclusiveRedisWorldIo(async () => {
    const cached = await options.store.getSnapshotJson();
    const { next, fanout } = await options.mutate(cached);
    await persistSnapshotAndFanout(options.store, next, fanout);
  });
}
