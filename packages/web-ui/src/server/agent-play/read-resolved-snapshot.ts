import {
  buildSnapshotWorldMap,
  type PreviewSnapshotJson,
} from "./preview-serialize.js";
import type { WorldSessionStore } from "./world-session-store.js";

export async function readResolvedSnapshot(options: {
  sid: string;
  store: WorldSessionStore;
}): Promise<PreviewSnapshotJson> {
  const { sid, store } = options;
  const cached = await store.getSnapshotJson();
  if (cached !== null && cached.sid === sid) {
    return cached;
  }
  return { sid, worldMap: buildSnapshotWorldMap([]) };
}
