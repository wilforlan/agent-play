import type { WorldBounds } from "./world-bounds.js";
import { MINIMUM_PLAY_WORLD_BOUNDS } from "./world-bounds.js";

export type OccupancyGridPoint = {
  x: number;
  y: number;
};

export const OCCUPANCY_POINT_MULTIPLIER = 5;
export const CONTINUOUS_RENDER_OFFSET = 0.2;
export const DEFAULT_AGENT_SPAWN_MIN_DISTANCE = 0.9;

/** Bottom-left zone Q1 — agents (spatial rectangle). */
export const SPATIAL_ZONE_INDEX_AGENTS = 0;
/** Top-left zone Q3 — spaces / amenities (spatial rectangle). */
export const SPATIAL_ZONE_INDEX_SPACES = 2;

export function spatialZoneBounds(quartileIndex: number): WorldBounds {
  const { minX, maxX, minY, maxY } = MINIMUM_PLAY_WORLD_BOUNDS;
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const halfX = spanX / 2;
  const halfY = spanY / 2;
  const midLeftMax = minX + halfX - 1;
  const midRightMin = minX + halfX;
  const midBottomMax = minY + halfY - 1;
  const midTopMin = minY + halfY;

  switch (quartileIndex) {
    case 0:
      return { minX, maxX: midLeftMax, minY, maxY: midBottomMax };
    case 1:
      return { minX: midRightMin, maxX, minY, maxY: midBottomMax };
    case 2:
      return { minX, maxX: midLeftMax, minY: midTopMin, maxY };
    case 3:
      return { minX: midRightMin, maxX, minY: midTopMin, maxY };
    default:
      throw new Error(
        `spatialZoneBounds: invalid zone index ${String(quartileIndex)}`
      );
  }
}

export function spatialZoneCenter(quartileIndex: number): OccupancyGridPoint {
  const b = spatialZoneBounds(quartileIndex);
  return {
    x: (b.minX + b.maxX + 1) / 2,
    y: (b.minY + b.maxY + 1) / 2,
  };
}

function enumerateIntegerCellsInBounds(bounds: WorldBounds): OccupancyGridPoint[] {
  const cells: OccupancyGridPoint[] = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function pointCellInSpatialZone(
  wx: number,
  wy: number,
  zoneIndex: number
): boolean {
  const bounds = spatialZoneBounds(zoneIndex);
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  return (
    cx >= bounds.minX &&
    cx <= bounds.maxX &&
    cy >= bounds.minY &&
    cy <= bounds.maxY
  );
}

export function listOccupancyPointsForSpatialZone(
  zoneIndex: number
): readonly OccupancyGridPoint[] {
  const bounds = spatialZoneBounds(zoneIndex);
  return enumerateIntegerCellsInBounds(bounds).flatMap((cell) => {
    const points: OccupancyGridPoint[] = [];
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
  });
}

export function occupancyPointsGroupedBySpatialZone(): readonly (
  readonly OccupancyGridPoint[]
)[] {
  return [
    listOccupancyPointsForSpatialZone(0),
    listOccupancyPointsForSpatialZone(1),
    listOccupancyPointsForSpatialZone(2),
    listOccupancyPointsForSpatialZone(3),
  ];
}

/** Agent spawns: Q1 only. */
export function listAllowedOccupancyPoints(): readonly OccupancyGridPoint[] {
  return listOccupancyPointsForSpatialZone(SPATIAL_ZONE_INDEX_AGENTS);
}

function quantizePosition(v: number): number {
  return Math.round(v * OCCUPANCY_POINT_MULTIPLIER) / OCCUPANCY_POINT_MULTIPLIER;
}

export function occupancyKeyForPosition(x: number, y: number): string {
  return `${quantizePosition(x).toFixed(3)},${quantizePosition(y).toFixed(3)}`;
}

export function buildRankedOccupancyPointsForSpatialZone(
  zoneIndex: number
): OccupancyGridPoint[] {
  const center = spatialZoneCenter(zoneIndex);
  return [...listOccupancyPointsForSpatialZone(zoneIndex)].sort((left, right) => {
    const dl = Math.hypot(left.x - center.x, left.y - center.y);
    const dr = Math.hypot(right.x - center.x, right.y - center.y);
    if (dl !== dr) {
      return dl - dr;
    }
    if (left.x !== right.x) {
      return left.x - right.x;
    }
    return left.y - right.y;
  });
}

/** Back-compat: agent-zone ranking only. */
export function buildRankedOccupancyPoints(): OccupancyGridPoint[] {
  return buildRankedOccupancyPointsForSpatialZone(SPATIAL_ZONE_INDEX_AGENTS);
}

export function boundingWorldRectForOccupancyPoints(
  points: readonly OccupancyGridPoint[]
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const head = points[0];
  if (head === undefined) {
    return null;
  }
  let minX = head.x;
  let maxX = head.x;
  let minY = head.y;
  let maxY = head.y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

export function isAgentSpawnOccupancyPointAvailable(input: {
  point: OccupancyGridPoint;
  occupiedKeys: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  minDistance?: number;
}): boolean {
  const minDistance = input.minDistance ?? DEFAULT_AGENT_SPAWN_MIN_DISTANCE;
  const key = occupancyKeyForPosition(input.point.x, input.point.y);
  if (input.occupiedKeys.has(key)) {
    return false;
  }
  if (
    !pointCellInSpatialZone(
      input.point.x,
      input.point.y,
      SPATIAL_ZONE_INDEX_AGENTS
    )
  ) {
    return false;
  }
  for (const existing of input.existingOccupants) {
    const dist = Math.hypot(
      input.point.x - existing.x,
      input.point.y - existing.y
    );
    if (dist < minDistance) {
      return false;
    }
  }
  return true;
}

export function isSpaceAnchorOccupancyPointAvailable(input: {
  point: OccupancyGridPoint;
  occupiedKeys: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  structureAnchors: ReadonlyArray<{ x: number; y: number }>;
  minDistance: number;
  structureMinDistance: number;
}): boolean {
  const key = occupancyKeyForPosition(input.point.x, input.point.y);
  if (input.occupiedKeys.has(key)) {
    return false;
  }
  if (
    !pointCellInSpatialZone(
      input.point.x,
      input.point.y,
      SPATIAL_ZONE_INDEX_SPACES
    )
  ) {
    return false;
  }
  for (const existing of input.existingOccupants) {
    const dist = Math.hypot(
      input.point.x - existing.x,
      input.point.y - existing.y
    );
    if (dist < input.minDistance) {
      return false;
    }
  }
  for (const anchor of input.structureAnchors) {
    const dist = Math.hypot(
      input.point.x - anchor.x,
      input.point.y - anchor.y
    );
    if (dist < input.structureMinDistance) {
      return false;
    }
  }
  return true;
}

