import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { WorldSessionStore } from "./world-session-store.js";
import {
  persistSnapshotAndFanout,
  runExclusiveRedisWorldIo,
  type RedisFanoutItem,
} from "./world-redis-sync.js";

export type { RedisFanoutItem };

export async function runStoredWorldMutation(options: {
  sid: string;
  store: WorldSessionStore;
  mutate: (
    snapshot: PreviewSnapshotJson | null
  ) => Promise<{ next: PreviewSnapshotJson; fanout: RedisFanoutItem[] }>;
}): Promise<void> {
  await runExclusiveRedisWorldIo(async () => {
    const cached = await options.store.getSnapshotJson();
    if (cached !== null && cached.sid !== options.sid) {
      throw new Error("stored snapshot session mismatch");
    }
    const { next, fanout } = await options.mutate(cached);
    if (next.sid !== options.sid) {
      throw new Error("mutation produced wrong session id");
    }
    await persistSnapshotAndFanout(options.store, next, fanout);
  });
}
