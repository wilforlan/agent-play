import type {
  PreviewSnapshotJson,
  PreviewWorldMapOccupantJson,
  PreviewWorldMapStructureOccupantJson,
} from "./preview-serialize.js";
import { agentPlayDebug } from "./agent-play-debug.js";
import type { OccupantGroup, WorldLayout, Zone } from "@agent-play/sdk";
import {
  buildRankedOccupancyPointsForSpatialZone,
  buildRankedOccupancyPointsForZone,
  DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
  isAgentSpawnOccupancyPointAvailable,
  isAgentSpawnOccupancyPointAvailableInZone,
  isSpaceAnchorOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailableInZone,
  listOccupancyPointsForZone,
  OCCUPANCY_POINT_MULTIPLIER,
  occupancyKeyForPosition,
  pickZoneForGroup,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
  type OccupancyGridPoint,
} from "@agent-play/sdk";

type GridPoint = OccupancyGridPoint;

const DEFAULT_MIN_OCCUPANT_DISTANCE = DEFAULT_AGENT_SPAWN_MIN_DISTANCE;

export const SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE = 3.6;

function occupantGroupForSpawn(
  kind: "agent" | "mcp" | "unknown" | undefined
): OccupantGroup {
  if (kind === "mcp") {
    return "mcp";
  }
  return "agent";
}

export function computeRandomFreeMapCellInZone(
  occupied: ReadonlySet<string>,
  zone: Zone,
  purpose: "agentSpawn" | "spaceAnchor",
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
  agentPlayDebug("grid-allocate", "computeRandomFreeMapCellInZone", {
    zoneId: zone.id,
    purpose,
    occupant: options?.occupantInfo,
    structureAnchorCount: structureAnchors.length,
  });
  const rankedCandidates = buildRankedOccupancyPointsForZone(zone);
  if (purpose === "agentSpawn") {
    const pick = rankedCandidates.find((candidate) =>
      isAgentSpawnOccupancyPointAvailableInZone({
        zone,
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
      `computeRandomFreeMapCellInZone: no free agent cell in zone ${zone.id}`
    );
  }
  const pick = rankedCandidates.find((candidate) =>
    isSpaceAnchorOccupancyPointAvailableInZone({
      zone,
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
    `computeRandomFreeMapCellInZone: no free space anchor in zone ${zone.id}`
  );
}

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
    worldLayout?: WorldLayout;
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
    usesWorldLayout: options?.worldLayout !== undefined,
  });
  if (options?.worldLayout !== undefined) {
    const layout = options.worldLayout;
    if (zoneIndex === SPATIAL_ZONE_INDEX_AGENTS) {
      const zone = pickZoneForGroup(layout, "agent");
      return computeRandomFreeMapCellInZone(occupied, zone, "agentSpawn", options);
    }
    if (zoneIndex === SPATIAL_ZONE_INDEX_SPACES) {
      const zone = pickZoneForGroup(layout, "space");
      return computeRandomFreeMapCellInZone(occupied, zone, "spaceAnchor", options);
    }
    throw new Error(
      `computeRandomFreeMapCellInSpatialZone: zone ${String(zoneIndex)} not supported with worldLayout`
    );
  }
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

export function computeRandomFreeMapCellInQuartile(
  occupied: ReadonlySet<string>,
  quartileIndex: number,
  options: {
    worldLayout: WorldLayout;
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
  void quartileIndex;
  const zone = pickZoneForGroup(options.worldLayout, "agent");
  return computeRandomFreeMapCellInZone(occupied, zone, "agentSpawn", options);
}

export function computeSpaceStructureAnchor(input: {
  occupied: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  structureAnchors: ReadonlyArray<{ x: number; y: number }>;
  worldLayout: WorldLayout;
}): { x: number; y: number } {
  return computeRandomFreeMapCellInSpatialZone(
    input.occupied,
    SPATIAL_ZONE_INDEX_SPACES,
    {
      existingOccupants: input.existingOccupants,
      structureAnchors: input.structureAnchors,
      worldLayout: input.worldLayout,
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

function isStructureOccupant(
  o: PreviewWorldMapOccupantJson
): o is PreviewWorldMapStructureOccupantJson {
  return o.kind === "structure";
}

/**
 * Re-anchors every structure occupant inside the current worldLayout space zone
 * deterministically (sorted by structure id, packed from zone center outward).
 *
 * @remarks Persisted x,y on structure rows is treated as advisory; the canonical
 * position is derived from `snapshot.worldLayout` at read time. Non-structure
 * occupants are treated as fixed obstacles.
 */
export function resolveStructureAnchorsAtRuntime(
  snapshot: PreviewSnapshotJson
): PreviewSnapshotJson {
  const layout = snapshot.worldLayout;
  const spaceZone = layout.zones.find((z) => z.primaryGroup === "space");
  if (spaceZone === undefined) {
    return snapshot;
  }
  const zone: Zone = {
    id: spaceZone.id,
    streetId: spaceZone.streetId,
    streetLabel: spaceZone.streetLabel,
    primaryGroup: spaceZone.primaryGroup,
    allowedGroups: spaceZone.allowedGroups,
    rect: { ...spaceZone.rect },
  };
  const fixedOccupants = snapshot.worldMap.occupants.filter(
    (o) => !isStructureOccupant(o)
  );
  const fixedOccupantPositions = fixedOccupants.map((o) => ({ x: o.x, y: o.y }));
  const occupied = new Set(
    fixedOccupants.map((o) => occupancyKeyForPosition(o.x, o.y))
  );
  const structures = snapshot.worldMap.occupants
    .filter(isStructureOccupant)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const reanchored: PreviewWorldMapStructureOccupantJson[] = [];
  const structureAnchors: Array<{ x: number; y: number }> = [];
  for (const row of structures) {
    try {
      const pos = computeRandomFreeMapCellInZone(occupied, zone, "spaceAnchor", {
        existingOccupants: [...fixedOccupantPositions, ...structureAnchors],
        structureAnchors,
      });
      reanchored.push({ ...row, x: pos.x, y: pos.y });
      occupied.add(occupancyKeyForPosition(pos.x, pos.y));
      structureAnchors.push({ x: pos.x, y: pos.y });
    } catch {
      reanchored.push(row);
    }
  }
  const byId = new Map(reanchored.map((s) => [s.id, s]));
  const nextOccupants: PreviewWorldMapOccupantJson[] =
    snapshot.worldMap.occupants.map((o) => {
      if (!isStructureOccupant(o)) return o;
      return byId.get(o.id) ?? o;
    });
  return {
    ...snapshot,
    worldMap: { ...snapshot.worldMap, occupants: nextOccupants },
  };
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
    worldLayout: WorldLayout;
  }
): { x: number; y: number } {
  void options?.rng;
  if (options?.worldLayout === undefined) {
    throw new Error("computeRandomFreeMapCell: worldLayout is required");
  }
  const minDistance = options.minDistance ?? DEFAULT_MIN_OCCUPANT_DISTANCE;
  const existingOccupants = options.existingOccupants ?? [];
  const layout = options.worldLayout;
  const group = occupantGroupForSpawn(options.occupantInfo?.kind);
  const zone = pickZoneForGroup(layout, group);
  const allowedPoints = listOccupancyPointsForZone(zone);
  agentPlayDebug("grid-allocate", "computeRandomFreeMapCell:candidates", {
    occupant: options.occupantInfo,
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
  const rankedCandidates = buildRankedOccupancyPointsForZone(zone);
  let selectedIndex = -1;
  let point: GridPoint | undefined;
  const indexFound = rankedCandidates.findIndex((candidate) =>
    isAgentSpawnOccupancyPointAvailableInZone({
      zone,
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
        isAgentSpawnOccupancyPointAvailableInZone({
          zone,
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
      occupant: options.occupantInfo,
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
  laneIndex: number,
  worldLayout: WorldLayout
): { x: number; y: number } {
  void laneIndex;
  return computeRandomFreeMapCell(occupied, { worldLayout });
}
