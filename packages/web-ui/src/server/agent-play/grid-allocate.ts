import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { agentPlayDebug } from "./agent-play-debug.js";

type GridPoint = {
  x: number;
  y: number;
};

type OccupancyRegion = {
  from: GridPoint;
  to: GridPoint;
};

const CONTINUOUS_RENDER_OFFSET = 0.2;
const OCCUPANCY_POINT_MULTIPLIER = 5;
const DEFAULT_MIN_OCCUPANT_DISTANCE = 0.9;

const ALLOWED_OCCUPANCY_REGIONS: readonly OccupancyRegion[] = [
  { from: { x: 0, y: 1 }, to: { x: 0, y: 2 } },
  { from: { x: 18, y: -1 }, to: { x: 18, y: 1 } },
];

const ALLOWED_OCCUPANCY_CELLS: readonly GridPoint[] = ALLOWED_OCCUPANCY_REGIONS.flatMap(
  (region) => {
    const minX = Math.min(region.from.x, region.to.x);
    const maxX = Math.max(region.from.x, region.to.x);
    const minY = Math.min(region.from.y, region.to.y);
    const maxY = Math.max(region.from.y, region.to.y);
    const cells: GridPoint[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        cells.push({ x, y });
      }
    }
    return cells;
  }
);

const ALLOWED_OCCUPANCY_POINTS: readonly GridPoint[] = ALLOWED_OCCUPANCY_CELLS.flatMap(
  (cell) => {
    const points: GridPoint[] = [];
    for (let dx = 0; dx < OCCUPANCY_POINT_MULTIPLIER; dx += 1) {
      for (let dy = 0; dy < OCCUPANCY_POINT_MULTIPLIER; dy += 1) {
        points.push({
          x:
            cell.x +
            CONTINUOUS_RENDER_OFFSET +
            (dx + 0.5) / OCCUPANCY_POINT_MULTIPLIER,
          y:
            cell.y +
            CONTINUOUS_RENDER_OFFSET +
            (dy + 0.5) / OCCUPANCY_POINT_MULTIPLIER,
        });
      }
    }
    return points;
  }
);

function quantizePosition(v: number): number {
  return Math.round(v * OCCUPANCY_POINT_MULTIPLIER) / OCCUPANCY_POINT_MULTIPLIER;
}

function occupancyKeyForPosition(x: number, y: number): string {
  return `${quantizePosition(x).toFixed(3)},${quantizePosition(y).toFixed(3)}`;
}

function toQuartileSizes(total: number): [number, number, number, number] {
  const base = Math.floor(total / 4);
  const remainder = total % 4;
  return [0, 1, 2, 3].map((idx) => base + (idx < remainder ? 1 : 0)) as [
    number,
    number,
    number,
    number,
  ];
}

export function occupiedKeysFromSnapshot(
  snapshot: PreviewSnapshotJson
): Set<string> {
  const s = new Set<string>();
  for (const o of snapshot.worldMap.occupants) {
    s.add(occupancyKeyForPosition(o.x, o.y));
  }
  return s;
}

export function computeRandomFreeMapCell(
  occupied: ReadonlySet<string>,
  options?: {
    rng?: () => number;
    existingOccupants?: ReadonlyArray<{ x: number; y: number }>;
    minDistance?: number;
    occupantInfo?: {
      id: string;
      kind: "agent" | "mcp" | "unknown";
      name?: string;
    };
  }
): { x: number; y: number } {
  void options?.rng;
  const minDistance = options?.minDistance ?? DEFAULT_MIN_OCCUPANT_DISTANCE;
  const existingOccupants = options?.existingOccupants ?? [];
  agentPlayDebug("grid-allocate", "computeRandomFreeMapCell:candidates", {
    occupant: options?.occupantInfo,
    multiplier: OCCUPANCY_POINT_MULTIPLIER,
    minDistance,
    existingOccupantCount: existingOccupants.length,
    candidateCount: ALLOWED_OCCUPANCY_POINTS.length,
    candidates: ALLOWED_OCCUPANCY_POINTS.map((p) => ({
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      cell: `${Math.floor(p.x)},${Math.floor(p.y)}`,
      key: occupancyKeyForPosition(p.x, p.y),
    })),
  });
  const isPointAvailable = (point: GridPoint): boolean => {
    const key = occupancyKeyForPosition(point.x, point.y);
    if (occupied.has(key)) {
      return false;
    }
    for (const existing of existingOccupants) {
      const dist = Math.hypot(point.x - existing.x, point.y - existing.y);
      if (dist < minDistance) {
        return false;
      }
    }
    return true;
  };
  const rankedCandidates = [...ALLOWED_OCCUPANCY_POINTS].sort((left, right) => {
    const leftDistance = Math.hypot(left.x, left.y);
    const rightDistance = Math.hypot(right.x, right.y);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    if (left.x !== right.x) {
      return left.x - right.x;
    }
    return left.y - right.y;
  });
  const quartileSizes = toQuartileSizes(rankedCandidates.length);
  let offset = 0;
  let selectedQuartileIndex = -1;
  let selectedIndex = -1;
  let point: GridPoint | undefined;
  for (let quartileIdx = 0; quartileIdx < quartileSizes.length; quartileIdx += 1) {
    const size = quartileSizes[quartileIdx];
    if (size > 0) {
      const quartile = rankedCandidates.slice(offset, offset + size);
      const indexInQuartile = quartile.findIndex((candidate) =>
        isPointAvailable(candidate)
      );
      if (indexInQuartile !== -1) {
        point = quartile[indexInQuartile];
        selectedQuartileIndex = quartileIdx;
        selectedIndex = offset + indexInQuartile;
        break;
      }
    }
    offset += size;
  }
  if (point !== undefined) {
    const freeCount = rankedCandidates.reduce(
      (count, candidate) => (isPointAvailable(candidate) ? count + 1 : count),
      0
    );
    if (point !== undefined) {
      agentPlayDebug("grid-allocate", "computeRandomFreeMapCell:selected", {
        occupant: options?.occupantInfo,
        occupiedCount: occupied.size,
        freeCount,
        selectedIndex,
        quartileSizes,
        selectedQuartile: selectedQuartileIndex + 1,
        selected: {
          x: Number(point.x.toFixed(3)),
          y: Number(point.y.toFixed(3)),
          cell: `${Math.floor(point.x)},${Math.floor(point.y)}`,
          key: occupancyKeyForPosition(point.x, point.y),
        },
        nearestDistance:
          existingOccupants.length === 0
            ? null
            : Number(
                Math.min(
                  ...existingOccupants.map((existing) =>
                    Math.hypot(point.x - existing.x, point.y - existing.y)
                  )
                ).toFixed(3)
              ),
      });
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
