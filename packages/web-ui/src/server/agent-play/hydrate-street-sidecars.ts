import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionStore } from "./session-store.js";

export async function hydrateStreetSidecars(
  store: SessionStore,
  snapshot: PreviewSnapshotJson,
  nowIso?: string
): Promise<{ snapshot: PreviewSnapshotJson; parkingChanged: boolean }> {
  const at = nowIso ?? new Date().toISOString();
  const [parkingTick, houseStreet] = await Promise.all([
    store.tickParkingExpiry(at),
    store.getHouseStreet(),
  ]);
  return {
    snapshot: {
      ...snapshot,
      parkingStreet: parkingTick.street,
      houseStreet,
    },
    parkingChanged: parkingTick.changed,
  };
}
