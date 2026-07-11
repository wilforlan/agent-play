import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionStore } from "./session-store.js";
import type { RedisFanoutItem } from "./world-redis-sync.js";

export type { RedisFanoutItem };

export async function runStoredWorldMutation(options: {
  store: SessionStore;
  mutate: (
    snapshot: PreviewSnapshotJson | null
  ) => Promise<{ next: PreviewSnapshotJson; fanout: RedisFanoutItem[] }>;
}): Promise<void> {
  await options.store.runSnapshotMutation({ mutate: options.mutate });
}
