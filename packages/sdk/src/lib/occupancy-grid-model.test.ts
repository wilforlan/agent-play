import { describe, expect, it } from "vitest";
import { MINIMUM_PLAY_WORLD_BOUNDS } from "./world-bounds.js";
import {
  buildRankedOccupancyPoints,
  buildRankedOccupancyPointsForSpatialZone,
  isAgentSpawnOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailable,
  listAllowedOccupancyPoints,
  listOccupancyPointsForSpatialZone,
  occupancyKeyForPosition,
  occupancyPointsGroupedBySpatialZone,
  pointCellInSpatialZone,
  spatialZoneBounds,
  spatialZoneCenter,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
} from "./occupancy-grid-model.js";

describe("occupancy-grid-model (spatial zones)", () => {
  it("partitions the minimum play rect into four equal cell rectangles", () => {
    const z0 = spatialZoneBounds(0);
    const z1 = spatialZoneBounds(1);
    const z2 = spatialZoneBounds(2);
    const z3 = spatialZoneBounds(3);
    expect(z0.maxX + 1).toBe(z1.minX);
    expect(z0.maxY + 1).toBe(z2.minY);
    expect(z1.maxY + 1).toBe(z3.minY);
    const cellCount = (b: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    }) => (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1);
    const n = cellCount(z0);
    expect(cellCount(z1)).toBe(n);
    expect(cellCount(z2)).toBe(n);
    expect(cellCount(z3)).toBe(n);
    expect(n).toBe(100);
  });

  it("lists agent-zone occupancy points with stable count", () => {
    const pts = listAllowedOccupancyPoints();
    expect(pts.length).toBe(100 * 25);
  });

  it("groups four spatial zones that partition all discrete points", () => {
    const groups = occupancyPointsGroupedBySpatialZone();
    expect(groups.length).toBe(4);
    const sum = groups.reduce((acc, g) => acc + g.length, 0);
    expect(sum).toBe(400 * 25);
  });

  it("ranks agent-zone points by distance from zone center", () => {
    const ranked = buildRankedOccupancyPoints();
    const center = spatialZoneCenter(SPATIAL_ZONE_INDEX_AGENTS);
    expect(ranked.length).toBe(2500);
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

  it("ranks space-zone points from its own center", () => {
    const ranked = buildRankedOccupancyPointsForSpatialZone(
      SPATIAL_ZONE_INDEX_SPACES
    );
    const center = spatialZoneCenter(SPATIAL_ZONE_INDEX_SPACES);
    expect(ranked.length).toBe(2500);
    const first = ranked[0];
    if (first === undefined) throw new Error("expected point");
    expect(Math.hypot(first.x - center.x, first.y - center.y)).toBeLessThanOrEqual(
      0.55
    );
  });

  it("restricts agent spawn availability to the agent spatial zone", () => {
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

  it("detects occupied keys for agents", () => {
    const ranked = buildRankedOccupancyPoints();
    const p = ranked[0];
    if (p === undefined) throw new Error("expected point");
    const key = occupancyKeyForPosition(p.x, p.y);
    expect(
      isAgentSpawnOccupancyPointAvailable({
        point: p,
        occupiedKeys: new Set([key]),
        existingOccupants: [],
      })
    ).toBe(false);
  });

  it("validates space anchors only inside the space zone", () => {
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

  it("classifies world coordinates into zones via floor cell", () => {
    expect(pointCellInSpatialZone(4.5, 4.5, SPATIAL_ZONE_INDEX_AGENTS)).toBe(true);
    expect(pointCellInSpatialZone(12.5, 4.5, SPATIAL_ZONE_INDEX_AGENTS)).toBe(
      false
    );
    expect(pointCellInSpatialZone(4.5, 14.5, SPATIAL_ZONE_INDEX_SPACES)).toBe(true);
  });

  it("zone 0 point bounding stays within minimum play rect", () => {
    const pts = listOccupancyPointsForSpatialZone(0);
    const center = spatialZoneCenter(0);
    expect(center.x).toBeGreaterThanOrEqual(MINIMUM_PLAY_WORLD_BOUNDS.minX);
    expect(center.y).toBeGreaterThanOrEqual(MINIMUM_PLAY_WORLD_BOUNDS.minY);
    expect(pts.length).toBeGreaterThan(0);
  });
});

