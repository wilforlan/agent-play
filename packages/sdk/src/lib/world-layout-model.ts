import type { WorldBounds } from "./world-bounds.js";
import {
  COLUMN_STREET_ROW_HEIGHT,
  PARKING_COLUMN_GAP_ROWS,
  PARKING_STREET_ROW_HEIGHT,
  parkingZoneMinYFromColumnBase,
  parkingZoneMaxYFromColumnBase,
} from "./world-bounds.js";
import {
  buildRankedOccupancyPointsInRect,
  isAgentSpawnOccupancyPointAvailableInRect,
  isSpaceAnchorOccupancyPointAvailableInRect,
  listOccupancyPointsInRect,
  type OccupancyGridPoint,
} from "./occupancy-grid-model.js";
import type { StreetPoolEntry } from "./world-streets-pool.js";
import { STREET_NAME_POOL } from "./world-streets-pool.js";

const LEGACY_MCP_PRIMARY_GROUP = "mcp";

function normalizeLegacyOccupantGroup(value: string): OccupantGroup {
  if (value === LEGACY_MCP_PRIMARY_GROUP) {
    return "arcade";
  }
  if (
    value === "agent" ||
    value === "space" ||
    value === "arcade" ||
    value === "parking"
  ) {
    return value;
  }
  throw new Error(
    `normalizeLegacyWorldLayout: unknown primaryGroup ${value}`
  );
}

function migrateLegacyWorldLayoutZone(zone: Zone): Zone {
  const rawPrimary = String(zone.primaryGroup);
  const primaryGroup = normalizeLegacyOccupantGroup(rawPrimary);
  const id =
    zone.id === "zone-mcp-strip" || rawPrimary === LEGACY_MCP_PRIMARY_GROUP
      ? primaryGroup === "arcade"
        ? "zone-arcade-strip"
        : zone.id
      : zone.id;
  const allowedGroups = [
    ...new Set(
      zone.allowedGroups.map((group) =>
        normalizeLegacyOccupantGroup(String(group))
      )
    ),
  ];
  return { ...zone, id, primaryGroup, allowedGroups };
}

function threeStreetsFromLayoutOrPool(
  layout: WorldLayout
): readonly [StreetPoolEntry, StreetPoolEntry, StreetPoolEntry] {
  if (layout.streets.length >= 3) {
    const s0 = layout.streets[0];
    const s1 = layout.streets[1];
    const s2 = layout.streets[2];
    if (s0 !== undefined && s1 !== undefined && s2 !== undefined) {
      return [
        { id: s0.id, label: s0.label },
        { id: s1.id, label: s1.label },
        { id: s2.id, label: s2.label },
      ];
    }
  }
  const a = STREET_NAME_POOL[0];
  const b = STREET_NAME_POOL[1];
  const c = STREET_NAME_POOL[2];
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("normalizeLegacyWorldLayout: STREET_NAME_POOL too small");
  }
  return [a, b, c];
}

export function normalizeLegacyWorldLayout(layout: WorldLayout): WorldLayout {
  const migratedZones = layout.zones.map(migrateLegacyWorldLayoutZone);
  if (migratedZones.some((zone) => zone.primaryGroup === "arcade")) {
    return { ...layout, zones: migratedZones };
  }
  const streets = threeStreetsFromLayoutOrPool(layout);
  const rebuilt = createVerticalStripSeedLayout({
    bounds: layout.bounds,
    streets,
  });
  return { ...rebuilt, rev: layout.rev };
}

export type OccupantGroup = "agent" | "space" | "arcade" | "parking";

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

export type WorldLayoutBoundsField = "minX" | "minY" | "maxX" | "maxY";

function assertIntegerBoundsValue(value: number, field: WorldLayoutBoundsField): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(
      `world-layout bounds: ${field} must be a finite integer (got ${String(value)})`
    );
  }
}

function assertValidLayoutBounds(bounds: WorldBounds): void {
  assertIntegerBoundsValue(bounds.minX, "minX");
  assertIntegerBoundsValue(bounds.minY, "minY");
  assertIntegerBoundsValue(bounds.maxX, "maxX");
  assertIntegerBoundsValue(bounds.maxY, "maxY");
  if (bounds.maxX < bounds.minX) {
    throw new Error(
      `world-layout bounds: maxX (${String(bounds.maxX)}) must be >= minX (${String(bounds.minX)})`
    );
  }
  if (bounds.maxY < bounds.minY) {
    throw new Error(
      `world-layout bounds: maxY (${String(bounds.maxY)}) must be >= minY (${String(bounds.minY)})`
    );
  }
  const spanX = bounds.maxX - bounds.minX + 1;
  const spanY = bounds.maxY - bounds.minY + 1;
  if (spanX < 3) {
    throw new Error(
      `world-layout bounds: spanX must be >= 3 to fit three street zones (got ${String(spanX)})`
    );
  }
  if (spanY < 1) {
    throw new Error(
      `world-layout bounds: spanY must be >= 1 (got ${String(spanY)})`
    );
  }
}

const PRIMARY_GROUP_ORDER: readonly OccupantGroup[] = [
  "agent",
  "space",
  "arcade",
];

function partitionColumnWidths(spanX: number): [number, number, number] {
  if (spanX === 20) {
    return [7, 7, 6];
  }
  const w0 = Math.floor(spanX / 3);
  const w1 = Math.floor((spanX - w0) / 2);
  const w2 = spanX - w0 - w1;
  return [w0, w1, w2];
}

function buildColumnZones(input: {
  bounds: WorldBounds;
  columnMinY: number;
  columnMaxY: number;
  streets: readonly [StreetPoolEntry, StreetPoolEntry, StreetPoolEntry];
}): Zone[] {
  const { minX, maxX } = input.bounds;
  const spanX = maxX - minX + 1;
  const widths = partitionColumnWidths(spanX);
  const w0 = widths[0];
  const w1 = widths[1];
  const w2 = widths[2];
  if (w0 === undefined || w1 === undefined || w2 === undefined) {
    throw new Error("buildColumnZones: width partition failed");
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
    throw new Error("buildColumnZones: expected three streets");
  }
  const { columnMinY, columnMaxY } = input;
  return [
    {
      id: "zone-agent-strip",
      streetId: s0.id,
      streetLabel: s0.label,
      rect: { minX: x0, maxX: x0Max, minY: columnMinY, maxY: columnMaxY },
      primaryGroup: "agent",
      allowedGroups: ["agent"],
    },
    {
      id: "zone-space-strip",
      streetId: s1.id,
      streetLabel: s1.label,
      rect: { minX: x1, maxX: x1Max, minY: columnMinY, maxY: columnMaxY },
      primaryGroup: "space",
      allowedGroups: ["space"],
    },
    {
      id: "zone-arcade-strip",
      streetId: s2.id,
      streetLabel: s2.label,
      rect: { minX: x2, maxX: x2Max, minY: columnMinY, maxY: columnMaxY },
      primaryGroup: "arcade",
      allowedGroups: ["arcade"],
    },
  ];
}

export function layoutHasParkingZone(layout: WorldLayout): boolean {
  return layout.zones.some((z) => z.primaryGroup === "parking");
}

function streetsFromLayoutWithParking(
  layout: WorldLayout
): readonly [
  StreetPoolEntry,
  StreetPoolEntry,
  StreetPoolEntry,
  StreetPoolEntry,
] {
  const agent = primaryZoneForGroup(layout, "agent");
  const space = primaryZoneForGroup(layout, "space");
  const arcade = primaryZoneForGroup(layout, "arcade");
  const parking = primaryZoneForGroup(layout, "parking");
  if (
    agent === undefined ||
    space === undefined ||
    arcade === undefined ||
    parking === undefined
  ) {
    throw new Error("streetsFromLayoutWithParking: missing primary zone");
  }
  return [
    { id: agent.streetId, label: agent.streetLabel },
    { id: space.streetId, label: space.streetLabel },
    { id: arcade.streetId, label: arcade.streetLabel },
    { id: parking.streetId, label: parking.streetLabel },
  ];
}

function streetsFromLayoutPrimaryGroups(
  layout: WorldLayout
): readonly [StreetPoolEntry, StreetPoolEntry, StreetPoolEntry] {
  const picks = PRIMARY_GROUP_ORDER.map((g) => {
    const zone = primaryZoneForGroup(layout, g);
    if (zone === undefined) {
      throw new Error(
        `migrateWorldLayoutBounds: missing primary zone for group "${g}"`
      );
    }
    return { id: zone.streetId, label: zone.streetLabel };
  });
  const a = picks[0];
  const s = picks[1];
  const m = picks[2];
  if (a === undefined || s === undefined || m === undefined) {
    throw new Error("migrateWorldLayoutBounds: failed to pick three streets");
  }
  return [a, s, m];
}

export function migrateWorldLayoutBounds(input: {
  layout: WorldLayout;
  bounds: WorldBounds;
}): WorldLayout {
  assertValidLayoutBounds(input.bounds);
  if (layoutHasParkingZone(input.layout)) {
    const streets = streetsFromLayoutWithParking(input.layout);
    const reseeded = createWorldLayoutWithParkingRow({
      bounds: input.bounds,
      streets,
    });
    return { ...reseeded, rev: input.layout.rev + 1 };
  }
  const streets = streetsFromLayoutPrimaryGroups(input.layout);
  const reseeded = createVerticalStripSeedLayout({
    bounds: input.bounds,
    streets,
  });
  return { ...reseeded, rev: input.layout.rev + 1 };
}

export function layoutNeedsParkingColumnGapMigration(
  layout: WorldLayout
): boolean {
  if (!layoutHasParkingZone(layout)) {
    return false;
  }
  const agent = primaryZoneForGroup(layout, "agent");
  const parking = primaryZoneForGroup(layout, "parking");
  if (agent === undefined || parking === undefined) {
    return false;
  }
  const expectedParkingMinY = parkingZoneMinYFromColumnBase(agent.rect.minY);
  return parking.rect.minY < expectedParkingMinY;
}

export function migrateLayoutToParkingColumnGap(
  layout: WorldLayout
): WorldLayout {
  const normalized = normalizeLegacyWorldLayout(layout);
  if (!layoutNeedsParkingColumnGapMigration(normalized)) {
    return normalized;
  }
  const streets = streetsFromLayoutWithParking(normalized);
  const { minX, minY, maxX } = normalized.bounds;
  const requiredMaxY = parkingZoneMaxYFromColumnBase(minY);
  const nextBounds: WorldBounds = {
    minX,
    minY,
    maxX,
    maxY: Math.max(normalized.bounds.maxY, requiredMaxY),
  };
  const reseeded = createWorldLayoutWithParkingRow({
    bounds: nextBounds,
    streets,
  });
  return { ...reseeded, rev: normalized.rev + 1 };
}

export function migrateLayoutToParkingRow(layout: WorldLayout): WorldLayout {
  const normalized = normalizeLegacyWorldLayout(layout);
  if (layoutHasParkingZone(normalized)) {
    return normalized;
  }
  const agent = primaryZoneForGroup(normalized, "agent");
  const space = primaryZoneForGroup(normalized, "space");
  const arcade = primaryZoneForGroup(normalized, "arcade");
  if (agent === undefined || space === undefined || arcade === undefined) {
    throw new Error("migrateLayoutToParkingRow: missing column zone");
  }
  const parkingStreet = nextStreetFromPool(
    new Set(normalized.streets.map((s) => s.id))
  );
  if (parkingStreet === undefined) {
    throw new Error("migrateLayoutToParkingRow: no street available in pool");
  }
  const nextBounds: WorldBounds = {
    ...normalized.bounds,
    maxY: Math.max(
      normalized.bounds.maxY,
      parkingZoneMaxYFromColumnBase(normalized.bounds.minY)
    ),
  };
  return createWorldLayoutWithParkingRow({
    bounds: nextBounds,
    streets: [
      { id: agent.streetId, label: agent.streetLabel },
      { id: space.streetId, label: space.streetLabel },
      { id: arcade.streetId, label: arcade.streetLabel },
      parkingStreet,
    ],
  });
}

export function applyBoundsFieldUpdateToLayout(input: {
  layout: WorldLayout;
  field: WorldLayoutBoundsField;
  value: number;
}): WorldLayout {
  assertIntegerBoundsValue(input.value, input.field);
  const nextBounds: WorldBounds = {
    ...input.layout.bounds,
    [input.field]: input.value,
  };
  return migrateWorldLayoutBounds({ layout: input.layout, bounds: nextBounds });
}

export function createVerticalStripSeedLayout(input: {
  bounds: WorldBounds;
  streets: readonly [StreetPoolEntry, StreetPoolEntry, StreetPoolEntry];
}): WorldLayout {
  const { minY, maxY } = input.bounds;
  const zones = buildColumnZones({
    bounds: input.bounds,
    columnMinY: minY,
    columnMaxY: maxY,
    streets: input.streets,
  });
  const s0 = input.streets[0];
  const s1 = input.streets[1];
  const s2 = input.streets[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("createVerticalStripSeedLayout: expected three streets");
  }
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

export function createWorldLayoutWithParkingRow(input: {
  bounds: WorldBounds;
  streets: readonly [
    StreetPoolEntry,
    StreetPoolEntry,
    StreetPoolEntry,
    StreetPoolEntry,
  ];
}): WorldLayout {
  const { minX, maxX, minY, maxY } = input.bounds;
  const spanX = maxX - minX + 1;
  if (spanX < 3) {
    throw new Error("createWorldLayoutWithParkingRow: bounds spanX too small");
  }
  const requiredSpanY = Math.ceil(
    COLUMN_STREET_ROW_HEIGHT + PARKING_COLUMN_GAP_ROWS + PARKING_STREET_ROW_HEIGHT
  );
  const actualSpanY = maxY - minY + 1;
  if (actualSpanY < requiredSpanY) {
    throw new Error(
      `createWorldLayoutWithParkingRow: spanY must be >= ${String(requiredSpanY)}`
    );
  }
  const columnMinY = minY;
  const columnMaxY = minY + COLUMN_STREET_ROW_HEIGHT - 1;
  const parkingMinY = parkingZoneMinYFromColumnBase(columnMinY);
  const parkingMaxY = parkingMinY + PARKING_STREET_ROW_HEIGHT - 1;
  if (parkingMaxY > maxY) {
    throw new Error("createWorldLayoutWithParkingRow: parking band exceeds bounds");
  }
  const s0 = input.streets[0];
  const s1 = input.streets[1];
  const s2 = input.streets[2];
  const s3 = input.streets[3];
  if (s0 === undefined || s1 === undefined || s2 === undefined || s3 === undefined) {
    throw new Error("createWorldLayoutWithParkingRow: expected four streets");
  }
  const columnZones = buildColumnZones({
    bounds: input.bounds,
    columnMinY,
    columnMaxY,
    streets: [s0, s1, s2],
  });
  const parkingZone: Zone = {
    id: "zone-parking-strip",
    streetId: s3.id,
    streetLabel: s3.label,
    rect: { minX, maxX, minY: parkingMinY, maxY: parkingMaxY },
    primaryGroup: "parking",
    allowedGroups: ["parking"],
  };
  const streets: Street[] = [
    streetFromPoolEntry(s0),
    streetFromPoolEntry(s1),
    streetFromPoolEntry(s2),
    streetFromPoolEntry(s3),
  ];
  return {
    rev: 1,
    bounds: input.bounds,
    zones: [...columnZones, parkingZone],
    streets,
  };
}
