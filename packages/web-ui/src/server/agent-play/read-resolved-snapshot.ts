import {
  normalizePreviewSnapshot,
  type PreviewSnapshotJson,
} from "./preview-serialize.js";
import { resolveStructureAnchorsAtRuntime } from "./grid-allocate.js";
import type { SessionStore } from "./session-store.js";
import { emptySnapshot } from "./world-snapshot-helpers.js";

export async function readResolvedSnapshot(options: {
  sid: string;
  store: SessionStore;
}): Promise<PreviewSnapshotJson> {
  const { store } = options;
  const cached = await store.getSnapshotJson();
  if (cached !== null) {
    return resolveStructureAnchorsAtRuntime(normalizePreviewSnapshot(cached));
  }
  return emptySnapshot(store.playerChainGenesis);
}
