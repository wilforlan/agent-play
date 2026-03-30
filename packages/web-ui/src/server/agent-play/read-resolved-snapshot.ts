import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { resolveSnapshotForResponse } from "./resolve-snapshot-for-response.js";
import type { RedisSessionStore } from "./redis-session-store.js";
import type { PlayWorld } from "./play-world.js";

export async function readResolvedSnapshot(options: {
  sid: string;
  world: PlayWorld;
  store: RedisSessionStore | null;
}): Promise<PreviewSnapshotJson> {
  const { sid, world, store } = options;
  const live = world.getSnapshotJson();
  if (store === null) {
    return live;
  }
  const cached = await store.getSnapshotJson();
  return resolveSnapshotForResponse({ sid, live, cached });
}
