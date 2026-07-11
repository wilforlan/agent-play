import type { ParkingSpot } from "@agent-play/sdk/browser";

export type ParkingBayAnchor = {
  bay: ParkingSpot["bay"];
  layer: ParkingSpot["layer"];
  x: number;
  y: number;
};

export const PARKING_BAY_ANCHORS: readonly ParkingBayAnchor[] = [
  { bay: 1, layer: 1, x: 3.5, y: 5.2 },
  { bay: 1, layer: 2, x: 3.5, y: 4.6 },
  { bay: 2, layer: 1, x: 8.5, y: 5.2 },
  { bay: 2, layer: 2, x: 8.5, y: 4.6 },
  { bay: 3, layer: 1, x: 13.5, y: 5.2 },
  { bay: 3, layer: 2, x: 13.5, y: 4.6 },
  { bay: 4, layer: 1, x: 18.5, y: 5.2 },
  { bay: 4, layer: 2, x: 18.5, y: 4.6 },
];

export const findNearestParkingBay = (input: {
  playerWorld: { x: number; y: number };
  maxDistance?: number;
}): (ParkingBayAnchor & { distance: number }) | null => {
  const maxDistance = input.maxDistance ?? 2.4;
  let best: (ParkingBayAnchor & { distance: number }) | null = null;
  for (const anchor of PARKING_BAY_ANCHORS) {
    const distance = Math.hypot(
      input.playerWorld.x - anchor.x,
      input.playerWorld.y - anchor.y
    );
    if (distance > maxDistance) {
      continue;
    }
    if (best === null || distance < best.distance) {
      best = { ...anchor, distance };
    }
  }
  return best;
};
