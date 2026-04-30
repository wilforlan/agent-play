import type { PreviewSnapshotJson } from "./preview-serialize.js";

type GridPoint = {
  x: number;
  y: number;
};

type OccupancyRegion = {
  from: GridPoint;
  to: GridPoint;
};

const CONTINUOUS_RENDER_OFFSET = 0.2;

const ALLOWED_OCCUPANCY_REGIONS: readonly OccupancyRegion[] = [
  { from: { x: 0, y: 1 }, to: { x: 0, y: 2 } },
  { from: { x: 18, y: -1 }, to: { x: 18, y: 1 } },
];

const ALLOWED_OCCUPANCY_POINTS: readonly GridPoint[] = ALLOWED_OCCUPANCY_REGIONS.flatMap(
  (region) => {
    const minX = Math.min(region.from.x, region.to.x);
    const maxX = Math.max(region.from.x, region.to.x);
    const minY = Math.min(region.from.y, region.to.y);
    const maxY = Math.max(region.from.y, region.to.y);
    const points: GridPoint[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        points.push({
          x: x + CONTINUOUS_RENDER_OFFSET,
          y: y + CONTINUOUS_RENDER_OFFSET,
        });
      }
    }
    return points;
  }
);

export function occupiedKeysFromSnapshot(
  snapshot: PreviewSnapshotJson
): Set<string> {
  const s = new Set<string>();
  for (const o of snapshot.worldMap.occupants) {
    s.add(`${Math.round(o.x)},${Math.round(o.y)}`);
  }
  return s;
}

export function computeRandomFreeMapCell(
  occupied: ReadonlySet<string>,
  options?: {
    rng?: () => number;
  }
): { x: number; y: number } {
  const rng = options?.rng ?? Math.random;
  const freePoints = ALLOWED_OCCUPANCY_POINTS.filter((point) => {
    const key = `${Math.round(point.x)},${Math.round(point.y)}`;
    return !occupied.has(key);
  });
  if (freePoints.length > 0) {
    const index = Math.min(
      freePoints.length - 1,
      Math.floor(rng() * freePoints.length)
    );
    const point = freePoints[index];
    if (point !== undefined) {
      return { x: point.x, y: point.y };
    }
  }
  throw new Error("computeRandomFreeMapCell: no free grid cell");
}

/**
 * @deprecated Use computeRandomFreeMapCell for sporadic distribution.
 */
export function computeFreeMapCell(
  occupied: ReadonlySet<string>,
  laneIndex: number
): { x: number; y: number } {
  void laneIndex;
  return computeRandomFreeMapCell(occupied);
}
