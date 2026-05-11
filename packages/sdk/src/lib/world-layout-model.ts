import type { WorldBounds } from "./world-bounds.js";
import {
  buildRankedOccupancyPointsInRect,
  isAgentSpawnOccupancyPointAvailableInRect,
  isSpaceAnchorOccupancyPointAvailableInRect,
  listOccupancyPointsInRect,
  type OccupancyGridPoint,
} from "./occupancy-grid-model.js";
import type { StreetPoolEntry } from "./world-streets-pool.js";
import { STREET_NAME_POOL } from "./world-streets-pool.js";

export type OccupantGroup = "agent" | "space" | "mcp";

export type Street = {
  id: string;
  label: string;
};

export type Zone = {
  id: string;
  streetId: string;
  streetLabel: string;
  rect: WorldBounds;
  primaryGroup: OccupantGroup;
  allowedGroups: readonly OccupantGroup[];
};

export type WorldLayout = {
  rev: number;
  bounds: WorldBounds;
  zones: readonly Zone[];
  streets: readonly Street[];
};

export function streetFromPoolEntry(entry: StreetPoolEntry): Street {
  return { id: entry.id, label: entry.label };
}

export function zonesForGroup(
  layout: WorldLayout,
  group: OccupantGroup
): readonly Zone[] {
  return layout.zones.filter((z) => z.allowedGroups.includes(group));
}

export function primaryZoneForGroup(
  layout: WorldLayout,
  group: OccupantGroup
): Zone | undefined {
  return layout.zones.find((z) => z.primaryGroup === group);
}

export function enumerateIntegerCellsInRect(rect: WorldBounds): OccupancyGridPoint[] {
  const cells: OccupancyGridPoint[] = [];
  for (let x = rect.minX; x <= rect.maxX; x += 1) {
    for (let y = rect.minY; y <= rect.maxY; y += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function cellsForZone(zone: Zone): readonly OccupancyGridPoint[] {
  return enumerateIntegerCellsInRect(zone.rect);
}

export function centerOfZone(zone: Zone): OccupancyGridPoint {
  const { minX, maxX, minY, maxY } = zone.rect;
  return {
    x: (minX + maxX + 1) / 2,
    y: (minY + maxY + 1) / 2,
  };
}

export function pointCellInZone(wx: number, wy: number, zone: Zone): boolean {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  const { minX, maxX, minY, maxY } = zone.rect;
  return (
    cx >= minX && cx <= maxX && cy >= minY && cy <= maxY
  );
}

export function listOccupancyPointsForZone(
  zone: Zone
): readonly OccupancyGridPoint[] {
  return listOccupancyPointsInRect(zone.rect);
}

export function buildRankedOccupancyPointsForZone(
  zone: Zone
): OccupancyGridPoint[] {
  return buildRankedOccupancyPointsInRect(zone.rect);
}

export function occupancyPointsGroupedByZones(
  layout: WorldLayout
): readonly (readonly OccupancyGridPoint[])[] {
  return layout.zones.map((z) => [...listOccupancyPointsForZone(z)]);
}

export function nextStreetFromPool(
  usedStreetIds: ReadonlySet<string>
): StreetPoolEntry | undefined {
  return STREET_NAME_POOL.find((s) => !usedStreetIds.has(s.id));
}

export function pickZoneForGroup(
  layout: WorldLayout,
  group: OccupantGroup
): Zone {
  const zone = primaryZoneForGroup(layout, group);
  if (zone === undefined) {
    throw new Error(
      `pickZoneForGroup: no primary zone for group ${String(group)}`
    );
  }
  return zone;
}

export function availableCellsForZone(
  zone: Zone,
  occupiedCellKeys: ReadonlySet<string>
): OccupancyGridPoint[] {
  return cellsForZone(zone).filter(
    (c) => !occupiedCellKeys.has(`${String(c.x)},${String(c.y)}`)
  );
}

export function isAgentSpawnOccupancyPointAvailableInZone(input: {
  zone: Zone;
  point: OccupancyGridPoint;
  occupiedKeys: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  minDistance?: number;
}): boolean {
  const base = {
    rect: input.zone.rect,
    point: input.point,
    occupiedKeys: input.occupiedKeys,
    existingOccupants: input.existingOccupants,
  };
  return input.minDistance === undefined
    ? isAgentSpawnOccupancyPointAvailableInRect(base)
    : isAgentSpawnOccupancyPointAvailableInRect({
        ...base,
        minDistance: input.minDistance,
      });
}

export function isSpaceAnchorOccupancyPointAvailableInZone(input: {
  zone: Zone;
  point: OccupancyGridPoint;
  occupiedKeys: ReadonlySet<string>;
  existingOccupants: ReadonlyArray<{ x: number; y: number }>;
  structureAnchors: ReadonlyArray<{ x: number; y: number }>;
  minDistance: number;
  structureMinDistance: number;
}): boolean {
  return isSpaceAnchorOccupancyPointAvailableInRect({
    rect: input.zone.rect,
    point: input.point,
    occupiedKeys: input.occupiedKeys,
    existingOccupants: input.existingOccupants,
    structureAnchors: input.structureAnchors,
    minDistance: input.minDistance,
    structureMinDistance: input.structureMinDistance,
  });
}

export function createVerticalStripSeedLayout(input: {
  bounds: WorldBounds;
  streets: readonly [StreetPoolEntry, StreetPoolEntry, StreetPoolEntry];
}): WorldLayout {
  const { minX, maxX, minY, maxY } = input.bounds;
  const spanX = maxX - minX + 1;
  if (spanX < 3) {
    throw new Error("createVerticalStripSeedLayout: bounds spanX too small");
  }
  const widths: [number, number, number] =
    spanX === 20 ? [7, 7, 6] : (() => {
      const w0 = Math.floor(spanX / 3);
      const w1 = Math.floor((spanX - w0) / 2);
      const w2 = spanX - w0 - w1;
      return [w0, w1, w2];
    })();
  const w0 = widths[0];
  const w1 = widths[1];
  const w2 = widths[2];
  if (w0 === undefined || w1 === undefined || w2 === undefined) {
    throw new Error("createVerticalStripSeedLayout: width partition failed");
  }
  const x0 = minX;
  const x0Max = x0 + w0 - 1;
  const x1 = x0Max + 1;
  const x1Max = x1 + w1 - 1;
  const x2 = x1Max + 1;
  const x2Max = x2 + w2 - 1;
  const s0 = input.streets[0];
  const s1 = input.streets[1];
  const s2 = input.streets[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("createVerticalStripSeedLayout: expected three streets");
  }
  const zones: Zone[] = [
    {
      id: "zone-agent-strip",
      streetId: s0.id,
      streetLabel: s0.label,
      rect: { minX: x0, maxX: x0Max, minY, maxY },
      primaryGroup: "agent",
      allowedGroups: ["agent"],
    },
    {
      id: "zone-space-strip",
      streetId: s1.id,
      streetLabel: s1.label,
      rect: { minX: x1, maxX: x1Max, minY, maxY },
      primaryGroup: "space",
      allowedGroups: ["space"],
    },
    {
      id: "zone-mcp-strip",
      streetId: s2.id,
      streetLabel: s2.label,
      rect: { minX: x2, maxX: x2Max, minY, maxY },
      primaryGroup: "mcp",
      allowedGroups: ["mcp"],
    },
  ];
  const streets: Street[] = [
    streetFromPoolEntry(s0),
    streetFromPoolEntry(s1),
    streetFromPoolEntry(s2),
  ];
  return {
    rev: 1,
    bounds: input.bounds,
    zones,
    streets,
  };
}
