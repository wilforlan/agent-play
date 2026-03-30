import type { PlayWorld } from "./play-world.js";
import type { RedisSessionStore } from "./redis-session-store.js";
import {
  persistSnapshotAndFanout,
  runExclusiveRedisWorldIo,
  type RedisFanoutItem,
} from "./world-redis-sync.js";

export type { RedisFanoutItem };

export async function runRedisBackedWorldMutation(options: {
  sid: string;
  world: PlayWorld;
  store: RedisSessionStore;
  mutate: () => Promise<RedisFanoutItem[]>;
}): Promise<void> {
  await runExclusiveRedisWorldIo(async () => {
    const cached = await options.store.getSnapshotJson();
    if (cached !== null && cached.sid === options.sid) {
      options.world.hydrateFromSnapshot(cached);
    }
    const fanout = await options.mutate();
    await persistSnapshotAndFanout(
      options.store,
      options.world.getSnapshotJson(),
      fanout
    );
  });
}
