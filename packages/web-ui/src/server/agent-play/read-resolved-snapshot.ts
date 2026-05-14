import {
  normalizePreviewSnapshot,
  snapshotWorldMapWithResolvedAgents,
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
    const n = normalizePreviewSnapshot(cached);
    return resolveStructureAnchorsAtRuntime({
      ...n,
      worldMap: snapshotWorldMapWithResolvedAgents(n.worldMap, n.worldLayout),
    });
  }
  return emptySnapshot(store.playerChainGenesis);
}
