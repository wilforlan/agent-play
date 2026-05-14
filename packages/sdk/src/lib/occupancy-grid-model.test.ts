import { describe, expect, it } from "vitest";
import { MINIMUM_STREET_LAYOUT_BOUNDS } from "./world-bounds.js";
import {
  buildRankedOccupancyPointsForZone,
  centerOfZone,
  createVerticalStripSeedLayout,
  isAgentSpawnOccupancyPointAvailableInZone,
  isSpaceAnchorOccupancyPointAvailableInZone,
  listOccupancyPointsForZone,
  pickZoneForGroup,
  pointCellInZone,
} from "./world-layout-model.js";
import { STREET_NAME_POOL } from "./world-streets-pool.js";
import {
  buildRankedOccupancyPoints,
  buildRankedOccupancyPointsForSpatialZone,
  isAgentSpawnOccupancyPointAvailable,
  isAgentSpawnOccupancyPointAvailableInRect,
  isSpaceAnchorOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailableInRect,
  occupancyKeyForPosition,
  pointCellInSpatialZone,
  spatialZoneBounds,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
} from "./occupancy-grid-model.js";

const threeSeedStreets = (): [
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
] => {
  const a = STREET_NAME_POOL[0];
  const b = STREET_NAME_POOL[1];
  const c = STREET_NAME_POOL[2];
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("STREET_NAME_POOL must have at least three entries");
  }
  return [a, b, c];
};

const layoutFixture = () =>
  createVerticalStripSeedLayout({
    bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
    streets: threeSeedStreets(),
  });

describe("occupancy-grid-model (rect and legacy quartiles)", () => {
  it("still exposes quartile bounds for deprecated callers", () => {
    const z0 = spatialZoneBounds(0);
    const z1 = spatialZoneBounds(1);
    expect(z0.maxX + 1).toBe(z1.minX);
    expect(z0.maxY + 1).toBe(spatialZoneBounds(2).minY);
  });

  it("lists occupancy points for a layout zone with stable count", () => {
    const layout = layoutFixture();
    const agent = pickZoneForGroup(layout, "agent");
    const pts = listOccupancyPointsForZone(agent);
    expect(pts.length).toBe(7 * 3 * 25);
  });

  it("aggregates three strip zones to full minimum play discrete coverage", () => {
    const layout = layoutFixture();
    const sum = layout.zones.reduce(
      (acc, z) => acc + listOccupancyPointsForZone(z).length,
      0
    );
    expect(sum).toBe(60 * 25);
  });

  it("ranks agent layout points by distance from zone center", () => {
    const layout = layoutFixture();
    const agent = pickZoneForGroup(layout, "agent");
    const ranked = buildRankedOccupancyPointsForZone(agent);
    const center = centerOfZone(agent);
    expect(ranked.length).toBe(7 * 3 * 25);
    for (let i = 1; i < ranked.length; i += 1) {
      const prev = ranked[i - 1];
      const cur = ranked[i];
      if (prev === undefined || cur === undefined) {
        throw new Error("expected ranked points");
      }
      const dPrev = Math.hypot(prev.x - center.x, prev.y - center.y);
      const dCur = Math.hypot(cur.x - center.x, cur.y - center.y);
      expect(dCur >= dPrev).toBe(true);
    }
  });

  it("ranks space layout zone points from its own center", () => {
    const layout = layoutFixture();
    const space = pickZoneForGroup(layout, "space");
    const ranked = buildRankedOccupancyPointsForZone(space);
    const c = centerOfZone(space);
    expect(ranked.length).toBe(7 * 3 * 25);
    const first = ranked[0];
    if (first === undefined) throw new Error("expected point");
    expect(Math.hypot(first.x - c.x, first.y - c.y)).toBeLessThanOrEqual(0.55);
  });

  it("restricts agent spawn availability to the agent layout zone", () => {
    const layout = layoutFixture();
    const agent = pickZoneForGroup(layout, "agent");
    const space = pickZoneForGroup(layout, "space");
    const a = buildRankedOccupancyPointsForZone(agent)[0];
    const s = buildRankedOccupancyPointsForZone(space)[0];
    if (a === undefined || s === undefined) throw new Error("points");
    expect(
      isAgentSpawnOccupancyPointAvailableInZone({
        zone: agent,
        point: a,
        occupiedKeys: new Set(),
        existingOccupants: [],
      })
    ).toBe(true);
    expect(
      isAgentSpawnOccupancyPointAvailableInZone({
        zone: agent,
        point: s,
        occupiedKeys: new Set(),
        existingOccupants: [],
      })
    ).toBe(false);
    expect(
      isAgentSpawnOccupancyPointAvailableInRect({
        rect: agent.rect,
        point: a,
        occupiedKeys: new Set(),
        existingOccupants: [],
      })
    ).toBe(true);
  });

  it("detects occupied keys for agents in rect API", () => {
    const layout = layoutFixture();
    const agent = pickZoneForGroup(layout, "agent");
    const ranked = buildRankedOccupancyPointsForZone(agent);
    const p = ranked[0];
    if (p === undefined) throw new Error("expected point");
    const key = occupancyKeyForPosition(p.x, p.y);
    expect(
      isAgentSpawnOccupancyPointAvailableInRect({
        rect: agent.rect,
        point: p,
        occupiedKeys: new Set([key]),
        existingOccupants: [],
      })
    ).toBe(false);
  });

  it("validates space anchors only inside the space layout zone", () => {
    const layout = layoutFixture();
    const space = pickZoneForGroup(layout, "space");
    const agent = pickZoneForGroup(layout, "agent");
    const p = buildRankedOccupancyPointsForZone(space)[0];
    const q = buildRankedOccupancyPointsForZone(agent)[0];
    if (p === undefined || q === undefined) throw new Error("points");
    expect(
      isSpaceAnchorOccupancyPointAvailableInZone({
        zone: space,
        point: p,
        occupiedKeys: new Set(),
        existingOccupants: [],
        structureAnchors: [],
        minDistance: 0.9,
        structureMinDistance: 3.5,
      })
    ).toBe(true);
    expect(
      isSpaceAnchorOccupancyPointAvailableInZone({
        zone: space,
        point: q,
        occupiedKeys: new Set(),
        existingOccupants: [],
        structureAnchors: [],
        minDistance: 0.9,
        structureMinDistance: 3.5,
      })
    ).toBe(false);
    expect(
      isSpaceAnchorOccupancyPointAvailableInRect({
        rect: space.rect,
        point: p,
        occupiedKeys: new Set(),
        existingOccupants: [],
        structureAnchors: [],
        minDistance: 0.9,
        structureMinDistance: 3.5,
      })
    ).toBe(true);
  });

  it("legacy agent spawn predicate still uses quartile zero", () => {
    const agents = buildRankedOccupancyPointsForSpatialZone(
      SPATIAL_ZONE_INDEX_AGENTS
    );
    const spaces = buildRankedOccupancyPointsForSpatialZone(
      SPATIAL_ZONE_INDEX_SPACES
    );
    const a = agents[0];
    const s = spaces[0];
    if (a === undefined || s === undefined) throw new Error("points");
    expect(
      isAgentSpawnOccupancyPointAvailable({
        point: a,
        occupiedKeys: new Set(),
        existingOccupants: [],
      })
    ).toBe(true);
    expect(
      isAgentSpawnOccupancyPointAvailable({
        point: s,
        occupiedKeys: new Set(),
        existingOccupants: [],
      })
    ).toBe(false);
  });

  it("legacy space anchor predicate still uses quartile two", () => {
    const ranked = buildRankedOccupancyPointsForSpatialZone(
      SPATIAL_ZONE_INDEX_SPACES
    );
    const p = ranked[0];
    const q = buildRankedOccupancyPointsForSpatialZone(0)[0];
    if (p === undefined || q === undefined) throw new Error("points");
    expect(
      isSpaceAnchorOccupancyPointAvailable({
        point: p,
        occupiedKeys: new Set(),
        existingOccupants: [],
        structureAnchors: [],
        minDistance: 0.9,
        structureMinDistance: 3.5,
      })
    ).toBe(true);
    expect(
      isSpaceAnchorOccupancyPointAvailable({
        point: q,
        occupiedKeys: new Set(),
        existingOccupants: [],
        structureAnchors: [],
        minDistance: 0.9,
        structureMinDistance: 3.5,
      })
    ).toBe(false);
  });

  it("classifies world coordinates into legacy quartiles via floor cell", () => {
    expect(pointCellInSpatialZone(4.5, 4.5, SPATIAL_ZONE_INDEX_AGENTS)).toBe(true);
    expect(pointCellInSpatialZone(12.5, 4.5, SPATIAL_ZONE_INDEX_AGENTS)).toBe(
      false
    );
    expect(pointCellInSpatialZone(4.5, 14.5, SPATIAL_ZONE_INDEX_SPACES)).toBe(true);
  });

  it("layout agent zone center stays within street layout rect", () => {
    const layout = layoutFixture();
    const agent = pickZoneForGroup(layout, "agent");
    const pts = listOccupancyPointsForZone(agent);
    const c = centerOfZone(agent);
    expect(c.x).toBeGreaterThanOrEqual(MINIMUM_STREET_LAYOUT_BOUNDS.minX);
    expect(c.y).toBeGreaterThanOrEqual(MINIMUM_STREET_LAYOUT_BOUNDS.minY);
    expect(pts.length).toBeGreaterThan(0);
    expect(pointCellInZone(c.x, c.y, agent)).toBe(true);
  });

  it("back-compat ranked agent points still length two thousand five hundred", () => {
    const ranked = buildRankedOccupancyPoints();
    expect(ranked.length).toBe(2500);
  });
});
