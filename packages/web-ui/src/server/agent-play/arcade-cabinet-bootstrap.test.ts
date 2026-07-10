import { describe, expect, it } from "vitest";
import {
  GAME_CABINET_CATALOG,
  createVerticalStripSeedLayout,
  pointCellInZone,
  primaryZoneForGroup,
  MINIMUM_STREET_LAYOUT_BOUNDS,
  STREET_NAME_POOL,
  type WorldLayout,
} from "@agent-play/sdk";
import {
  buildSnapshotWorldLayout,
  type PreviewSnapshotJson,
  type PreviewWorldMapOccupantJson,
  type PreviewWorldMapStructureOccupantJson,
} from "./preview-serialize.js";
import { ensureArcadeCabinetsInSnapshot } from "./arcade-cabinet-bootstrap.js";

const isArcadeCabinetOccupant = (
  o: PreviewWorldMapOccupantJson
): o is PreviewWorldMapStructureOccupantJson & { gameId: string } =>
  o.kind === "structure" && o.gameId !== undefined;

const layout = (): WorldLayout => {
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("STREET_NAME_POOL too small");
  }
  return createVerticalStripSeedLayout({
    bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
    streets: [s0, s1, s2],
  });
};

const emptySnap = (worldLayout: WorldLayout): PreviewSnapshotJson => ({
  sid: "s1",
  rev: 1,
  bounds: worldLayout.bounds,
  worldMap: { bounds: worldLayout.bounds, occupants: [] },
  worldLayout: buildSnapshotWorldLayout(worldLayout),
  spaces: [],
});

describe("ensureArcadeCabinetsInSnapshot", () => {
  it("seeds all eight arcade cabinets when none exist", () => {
    const l = layout();
    const next = ensureArcadeCabinetsInSnapshot({
      snapshot: emptySnap(l),
      worldLayout: l,
    });
    const cabinets = next.worldMap.occupants.filter(isArcadeCabinetOccupant);
    expect(cabinets).toHaveLength(GAME_CABINET_CATALOG.length);
    for (const entry of GAME_CABINET_CATALOG) {
      expect(
        cabinets.some((c) => c.kind === "structure" && c.id === entry.id)
      ).toBe(true);
    }
  });

  it("does not duplicate cabinets that already exist", () => {
    const l = layout();
    const first = ensureArcadeCabinetsInSnapshot({
      snapshot: emptySnap(l),
      worldLayout: l,
    });
    const second = ensureArcadeCabinetsInSnapshot({
      snapshot: first,
      worldLayout: l,
    });
    const cabinets = second.worldMap.occupants.filter(isArcadeCabinetOccupant);
    expect(cabinets).toHaveLength(GAME_CABINET_CATALOG.length);
  });

  it("re-anchors existing cabinets stuck at the origin", () => {
    const l = layout();
    const seeded = ensureArcadeCabinetsInSnapshot({
      snapshot: emptySnap(l),
      worldLayout: l,
    });
    const stuckAtOrigin = {
      ...seeded,
      worldMap: {
        ...seeded.worldMap,
        occupants: seeded.worldMap.occupants.map((occupant) =>
          occupant.kind === "structure" && occupant.gameId !== undefined
            ? { ...occupant, x: 0, y: 0 }
            : occupant
        ),
      },
    };
    const resolved = ensureArcadeCabinetsInSnapshot({
      snapshot: stuckAtOrigin,
      worldLayout: l,
    });
    const cabinets = resolved.worldMap.occupants.filter(isArcadeCabinetOccupant);
    const arcadeZone = primaryZoneForGroup(l, "arcade");
    expect(arcadeZone).toBeDefined();
    for (const cabinet of cabinets) {
      expect(cabinet.x !== 0 || cabinet.y !== 0).toBe(true);
      if (arcadeZone !== undefined) {
        expect(pointCellInZone(cabinet.x, cabinet.y, arcadeZone)).toBe(true);
      }
    }
  });
});
