import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { agentPlayDebug } from "./agent-play-debug.js";
import {
  buildRankedOccupancyPointsForSpatialZone,
  DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
  isAgentSpawnOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailable,
  listAllowedOccupancyPoints,
  OCCUPANCY_POINT_MULTIPLIER,
  occupancyKeyForPosition,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
  type OccupancyGridPoint,
} from "@agent-play/sdk";

type GridPoint = OccupancyGridPoint;

const DEFAULT_MIN_OCCUPANT_DISTANCE = DEFAULT_AGENT_SPAWN_MIN_DISTANCE;

/** Minimum distance between space structure anchors (amenities spaced fairly apart). */
export const SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE = 3.6;

export function computeRandomFreeMapCellInSpatialZone(
  occupied: ReadonlySet<string>,
  zoneIndex: number,
  options?: {
    existingOccupants?: ReadonlyArray<{ x: number; y: number }>;
    structureAnchors?: ReadonlyArray<{ x: number; y: number }>;
    minDistance?: number;
    structureMinDistance?: number;
    occupantInfo?: {
      id: string;
      kind: "agent" | "mcp" | "unknown";
      name?: string;
    };
  }
): { x: number; y: number } {
  const minDistance = options?.minDistance ?? DEFAULT_MIN_OCCUPANT_DISTANCE;
  const structureMinDistance =
    options?.structureMinDistance ?? SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE;
  const existingOccupants = options?.existingOccupants ?? [];
  const structureAnchors = options?.structureAnchors ?? [];
  agentPlayDebug("grid-allocate", "computeRandomFreeMapCellInSpatialZone", {
    zoneIndex,
    occupant: options?.occupantInfo,
    structureAnchorCount: structureAnchors.length,
  });
  const rankedCandidates = buildRankedOccupancyPointsForSpatialZone(zoneIndex);
  if (zoneIndex === SPATIAL_ZONE_INDEX_AGENTS) {
    const pick = rankedCandidates.find((candidate) =>
      isAgentSpawnOccupancyPointAvailable({
        point: candidate,
        occupiedKeys: occupied,
        existingOccupants,
        minDistance,
      })
    );
    if (pick !== undefined) {
      return { x: pick.x, y: pick.y };
    }
    throw new Error(
      `computeRandomFreeMapCellInSpatialZone: no free agent cell in zone ${String(
        zoneIndex
      )}`
    );
  }
  if (zoneIndex === SPATIAL_ZONE_INDEX_SPACES) {
    const pick = rankedCandidates.find((candidate) =>
      isSpaceAnchorOccupancyPointAvailable({
        point: candidate,
        occupiedKeys: occupied,
        existingOccupants,
        structureAnchors,
        minDistance,
        structureMinDistance,
      })
    );
    if (pick !== undefined) {
      return { x: pick.x, y: pick.y };
    }
    throw new Error(
      `computeRandomFreeMapCellInSpatialZone: no free space anchor in zone ${String(
        zoneIndex
      )}`
    );
  }
  throw new Error(
    `computeRandomFreeMapCellInSpatialZone: zone ${String(zoneIndex)} not supported`
  );
}

/**
 * @deprecated Prefer {@link computeRandomFreeMapCellInSpatialZone} with {@link SPATIAL_ZONE_INDEX_AGENTS} or {@link SPATIAL_ZONE_INDEX_SPACES}.
 */
export function computeRandomFreeMapCellInQuartile(
  occupied: ReadonlySet<string>,
  quartileIndex: number,
  options?: {
    existingOccupants?: ReadonlyArray<{ x: number; y: number }>;
    structureAnchors?: ReadonlyArray<{ x: number; y: number }>;
    minDistance?: number;
    structureMinDistance?: number;
    occupantInfo?: {
      id: string;
      kind: "agent" | "mcp" | "unknown";
      name?: string;
    };
  }
): { x: number; y: number } {
  return computeRandomFreeMapCellInSpatialZone(occupied, quartileIndex, options);
}

export function computeSpaceStructureAnchor(input: {
  occupied: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  structureAnchors: ReadonlyArray<{ x: number; y: number }>;
}): { x: number; y: number } {
  return computeRandomFreeMapCellInSpatialZone(
    input.occupied,
    SPATIAL_ZONE_INDEX_SPACES,
    {
      existingOccupants: input.existingOccupants,
      structureAnchors: input.structureAnchors,
    }
  );
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
  const allowedPoints = listAllowedOccupancyPoints();
  agentPlayDebug("grid-allocate", "computeRandomFreeMapCell:candidates", {
    occupant: options?.occupantInfo,
    multiplier: OCCUPANCY_POINT_MULTIPLIER,
    minDistance,
    existingOccupantCount: existingOccupants.length,
    candidateCount: allowedPoints.length,
    candidates: allowedPoints.map((p) => ({
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      cell: `${Math.floor(p.x)},${Math.floor(p.y)}`,
      key: occupancyKeyForPosition(p.x, p.y),
    })),
  });
  const rankedCandidates =
    buildRankedOccupancyPointsForSpatialZone(SPATIAL_ZONE_INDEX_AGENTS);
  let selectedIndex = -1;
  let point: GridPoint | undefined;
  const indexFound = rankedCandidates.findIndex((candidate) =>
    isAgentSpawnOccupancyPointAvailable({
      point: candidate,
      occupiedKeys: occupied,
      existingOccupants,
      minDistance,
    })
  );
  if (indexFound !== -1) {
    point = rankedCandidates[indexFound];
    selectedIndex = indexFound;
  }
  if (point !== undefined) {
    const freeCount = rankedCandidates.reduce(
      (count, candidate) =>
        isAgentSpawnOccupancyPointAvailable({
          point: candidate,
          occupiedKeys: occupied,
          existingOccupants,
          minDistance,
        })
          ? count + 1
          : count,
      0
    );
    agentPlayDebug("grid-allocate", "computeRandomFreeMapCell:selected", {
      occupant: options?.occupantInfo,
      occupiedCount: occupied.size,
      freeCount,
      selectedIndex,
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
  throw new Error("computeRandomFreeMapCell: no free grid cell");
}

export function computeFreeMapCell(
  occupied: ReadonlySet<string>,
  laneIndex: number
): { x: number; y: number } {
  void laneIndex;
  return computeRandomFreeMapCell(occupied);
}
