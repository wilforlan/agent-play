import { describe, expect, it } from "vitest";
import {
  buildSnapshotWorldLayout,
  type PreviewSnapshotJson,
  type PreviewWorldMapStructureOccupantJson,
} from "./preview-serialize.js";
import { resolveStructureAnchorsAtRuntime } from "./grid-allocate.js";
import {
  createVerticalStripSeedLayout,
  pointCellInZone,
  primaryZoneForGroup,
  type WorldBounds,
  type WorldLayout,
} from "@agent-play/sdk";

const STREET_TRIPLET: readonly [
  { id: string; label: string },
  { id: string; label: string },
  { id: string; label: string },
] = [
  { id: "st-agent", label: "Agent St." },
  { id: "st-space", label: "Space Ave." },
  { id: "st-mcp", label: "MCP Way." },
];

function makeLayout(bounds: WorldBounds): WorldLayout {
  return createVerticalStripSeedLayout({ bounds, streets: STREET_TRIPLET });
}

function makeStructure(
  id: string,
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
    spaceIds: [`sp-${id}`],
  };
}

function snapshotWithStructures(
  layout: WorldLayout,
  structures: PreviewWorldMapStructureOccupantJson[]
): PreviewSnapshotJson {
  return {
    sid: "test-sid",
    rev: 1,
    bounds: layout.bounds,
    worldMap: {
      bounds: layout.bounds,
      occupants: [...structures],
    },
    worldLayout: buildSnapshotWorldLayout(layout),
    spaces: structures.map((s) => ({
      id: `sp-${s.id}`,
      name: s.name,
      description: "",
      designKey: "supermarket-v1",
      owner: { displayName: "owner" },
      amenities: ["supermarket"],
    })),
  };
}

function structureKey(o: PreviewWorldMapStructureOccupantJson): string {
  return `${String(o.x)},${String(o.y)}`;
}

function resolveAndListStructures(
  snapshot: PreviewSnapshotJson
): PreviewWorldMapStructureOccupantJson[] {
  const resolved = resolveStructureAnchorsAtRuntime(snapshot);
  return resolved.worldMap.occupants.filter(
    (o): o is PreviewWorldMapStructureOccupantJson => o.kind === "structure"
  );
}

describe("resolveStructureAnchorsAtRuntime — proximity bugs", () => {
  it("never assigns the same position to two structures", () => {
    const layout = makeLayout({ minX: 0, minY: 0, maxX: 19, maxY: 19 });
    const structures = [
      makeStructure("s1", 8, 5),
      makeStructure("s2", 9, 10),
      makeStructure("s3", 7, 15),
      makeStructure("s4", 10, 18),
    ];
    const resolvedStructures = resolveAndListStructures(
      snapshotWithStructures(layout, structures)
    );
    const keys = resolvedStructures.map(structureKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("does not fall back to a persisted position that collides with an already-resolved structure", () => {
    const layout = makeLayout({ minX: 0, minY: 0, maxX: 5, maxY: 4 });
    const singleResolved = resolveAndListStructures(
      snapshotWithStructures(layout, [makeStructure("solo", 2, 2)])
    );
    const head = singleResolved[0];
    if (head === undefined) {
      throw new Error("expected one resolved structure");
    }
    const occupiedSpot = { x: head.x, y: head.y };
    const structures = [
      makeStructure("aaa-first", 0, 0),
      makeStructure("zzz-clash", occupiedSpot.x, occupiedSpot.y),
    ];
    const resolvedStructures = resolveAndListStructures(
      snapshotWithStructures(layout, structures)
    );
    const keys = resolvedStructures.map(structureKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps positions unique even when the space zone is too small to honour structureMinDistance", () => {
    const layout = makeLayout({ minX: 0, minY: 0, maxX: 5, maxY: 4 });
    const spaceZone = primaryZoneForGroup(layout, "space");
    expect(spaceZone).toBeDefined();
    const structures = [
      makeStructure("a", 2, 0),
      makeStructure("b", 2, 1),
      makeStructure("c", 2, 2),
      makeStructure("d", 2, 3),
      makeStructure("e", 2, 4),
    ];
    const resolvedStructures = resolveAndListStructures(
      snapshotWithStructures(layout, structures)
    );
    const keys = resolvedStructures.map(structureKey);
    expect(new Set(keys).size).toBe(keys.length);
    if (spaceZone !== undefined) {
      for (const s of resolvedStructures) {
        expect(pointCellInZone(s.x, s.y, spaceZone)).toBe(true);
      }
    }
  });

  it("keeps positions unique when many structures share an out-of-zone persisted cell", () => {
    const layout = makeLayout({ minX: 0, minY: 0, maxX: 19, maxY: 19 });
    const structures = [
      makeStructure("a", 0, 0),
      makeStructure("b", 0, 0),
      makeStructure("c", 0, 0),
    ];
    const resolvedStructures = resolveAndListStructures(
      snapshotWithStructures(layout, structures)
    );
    const keys = resolvedStructures.map(structureKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
