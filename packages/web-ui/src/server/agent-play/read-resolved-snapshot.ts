import {
  normalizePreviewSnapshot,
  snapshotWorldMapWithResolvedAgents,
  type PreviewSnapshotJson,
} from "./preview-serialize.js";
import { resolveStructureAnchorsAtRuntime } from "./grid-allocate.js";
import { hydrateStreetSidecars } from "./hydrate-street-sidecars.js";
import type { SessionStore } from "./session-store.js";
import { emptySnapshot } from "./world-snapshot-helpers.js";

async function resolveBaseSnapshot(
  store: SessionStore
): Promise<PreviewSnapshotJson> {
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

export async function readResolvedSnapshotWithMeta(options: {
  sid: string;
  store: SessionStore;
}): Promise<{ snapshot: PreviewSnapshotJson; parkingChanged: boolean }> {
  void options.sid;
  const base = await resolveBaseSnapshot(options.store);
  return hydrateStreetSidecars(options.store, base);
}

export async function readResolvedSnapshot(options: {
  sid: string;
  store: SessionStore;
}): Promise<PreviewSnapshotJson> {
  const { snapshot } = await readResolvedSnapshotWithMeta(options);
  return snapshot;
}
