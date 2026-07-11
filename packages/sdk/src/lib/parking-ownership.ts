export const MAX_TIMED_PARKING_SLOTS_PER_NODE = 2;
export const MAX_SLOTS_WITH_FOREVER = 1;

export type ParkingDurationTier =
  | "1h"
  | "12h"
  | "1d"
  | "3d"
  | "7d"
  | "1mo"
  | "3mo"
  | "1y"
  | "forever";

export type ParkingOccupancyRef = {
  readonly nodeId: string;
  readonly tier: ParkingDurationTier;
  readonly expiresAt: string | null;
};

export type ParkingOwnershipError =
  | "PARKING_OWNERSHIP_LIMIT"
  | "PARKING_FOREVER_LIMIT";

export const canNodeAcquireParkingSpot = (input: {
  nodeId: string;
  tier: ParkingDurationTier;
  active: ReadonlyArray<ParkingOccupancyRef>;
}):
  | { ok: true }
  | { ok: false; error: ParkingOwnershipError } => {
  const mine = input.active.filter((o) => o.nodeId === input.nodeId);
  const hasForever = mine.some(
    (o) => o.tier === "forever" || o.expiresAt === null
  );

  if (input.tier === "forever") {
    if (mine.length > 0) {
      return { ok: false, error: "PARKING_FOREVER_LIMIT" };
    }
    return { ok: true };
  }

  if (hasForever) {
    return { ok: false, error: "PARKING_FOREVER_LIMIT" };
  }

  if (mine.length >= MAX_TIMED_PARKING_SLOTS_PER_NODE) {
    return { ok: false, error: "PARKING_OWNERSHIP_LIMIT" };
  }

  return { ok: true };
};
