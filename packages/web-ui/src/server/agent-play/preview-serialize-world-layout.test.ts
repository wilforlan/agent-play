import { describe, expect, it } from "vitest";
import {
  GAME_CABINET_CATALOG,
  createVerticalStripSeedLayout,
  pointCellInZone,
  primaryZoneForGroup,
  type GameId,
  type WorldBounds,
  type WorldLayout,
} from "@agent-play/sdk";
import { resolveStructureAnchorsAtRuntime } from "./grid-allocate.js";
import {
  buildSnapshotWorldLayout,
  normalizePreviewSnapshot,
  type PreviewSnapshotJson,
  type PreviewWorldMapStructureOccupantJson,
  type WorldLayoutJson,
} from "./preview-serialize.js";

const STREET_TRIPLET: readonly [
  { id: string; label: string },
  { id: string; label: string },
  { id: string; label: string },
] = [
  { id: "st-agent", label: "Agent St." },
  { id: "st-space", label: "Space Ave." },
  { id: "st-arcade", label: "Maple Ave." },
];

function makeLayout(bounds: WorldBounds): WorldLayout {
  return createVerticalStripSeedLayout({ bounds, streets: STREET_TRIPLET });
}

function makeArcadeCabinet(
  id: string,
  gameId: GameId,
  x: number,
  y: number
): PreviewWorldMapStructureOccupantJson {
  return {
    kind: "structure",
    id,
    name: id,
    x,
    y,
    worldId: "overworld",
    spaceIds: [],
    gameId,
    stationary: true,
  };
}

function legacyMcpWorldLayout(layout: WorldLayout): WorldLayoutJson {
  const wire = buildSnapshotWorldLayout(layout);
  return {
    ...wire,
    zones: wire.zones.map((zone) => {
      if (zone.primaryGroup !== "arcade") {
        return zone;
      }
      return {
        ...zone,
        id: "zone-mcp-strip",
        primaryGroup: "mcp" as "arcade",
        allowedGroups: ["mcp" as "arcade"],
      };
    }),
  };
}

function snapshotWithLegacyMcpLayout(
  layout: WorldLayout,
  cabinets: PreviewWorldMapStructureOccupantJson[]
): PreviewSnapshotJson {
  return {
    sid: "test-sid",
    rev: 1,
    bounds: layout.bounds,
    worldMap: {
      bounds: layout.bounds,
      occupants: [...cabinets],
    },
    worldLayout: legacyMcpWorldLayout(layout),
    spaces: [],
  };
}

describe("normalizePreviewSnapshot — legacy world layout", () => {
  it("re-anchors arcade cabinets into zone-arcade-strip after mcp migration", () => {
    const layout = makeLayout({ minX: 0, minY: 0, maxX: 19, maxY: 19 });
    const cabinets = GAME_CABINET_CATALOG.map((entry) =>
      makeArcadeCabinet(entry.id, entry.gameId, 0, 0)
    );
    const raw = snapshotWithLegacyMcpLayout(layout, cabinets);
    const normalized = normalizePreviewSnapshot(raw);
    const arcadeZone = normalized.worldLayout.zones.find(
      (z) => z.primaryGroup === "arcade"
    );
    expect(arcadeZone?.id).toBe("zone-arcade-strip");

    const resolved = resolveStructureAnchorsAtRuntime(normalized);
    const resolvedCabinets = resolved.worldMap.occupants.filter(
      (o): o is PreviewWorldMapStructureOccupantJson =>
        o.kind === "structure" && typeof o.gameId === "string"
    );
    expect(resolvedCabinets).toHaveLength(8);
    const runtimeArcadeZone = primaryZoneForGroup(layout, "arcade");
    expect(runtimeArcadeZone).toBeDefined();
    for (const cabinet of resolvedCabinets) {
      expect(cabinet.x !== 0 || cabinet.y !== 0).toBe(true);
      if (runtimeArcadeZone !== undefined) {
        expect(pointCellInZone(cabinet.x, cabinet.y, runtimeArcadeZone)).toBe(
          true
        );
      }
    }
  });
});
