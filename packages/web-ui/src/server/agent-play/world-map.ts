import {
  expandBoundsToMinimumPlayArea,
  MINIMUM_PLAY_WORLD_BOUNDS,
  type WorldBounds,
} from "@agent-play/sdk";

export function buildWorldMapFromOccupants<T extends { x: number; y: number }>(
  occupants: T[]
): { bounds: WorldBounds; occupants: T[] } {
  if (occupants.length === 0) {
    return { bounds: MINIMUM_PLAY_WORLD_BOUNDS, occupants: [] };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const o of occupants) {
    minX = Math.min(minX, o.x);
    minY = Math.min(minY, o.y);
    maxX = Math.max(maxX, o.x);
    maxY = Math.max(maxY, o.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { bounds: MINIMUM_PLAY_WORLD_BOUNDS, occupants };
  }
  const tight: WorldBounds = { minX, minY, maxX, maxY };
  return {
    bounds: expandBoundsToMinimumPlayArea(tight),
    occupants,
  };
}
