import { describe, expect, it } from "vitest";
import {
  HOUSE_BLUEPRINTS,
  clampHousePosition,
  houseSpawnPosition,
  layoutHouseFixtures,
} from "./house-layout-model.js";

const REQUIRED_FIXTURE_KINDS = ["bed", "wardrobe", "mirror", "window"] as const;

describe("house layout blueprints", () => {
  it("each blueprint includes required fixtures", () => {
    for (const blueprint of HOUSE_BLUEPRINTS) {
      const slots = layoutHouseFixtures(blueprint);
      for (const kind of REQUIRED_FIXTURE_KINDS) {
        expect(slots.some((s) => s.kind === kind)).toBe(true);
      }
    }
  });

  it("house 1 and house 2 place beds at different coordinates", () => {
    const b1 = HOUSE_BLUEPRINTS.find((b) => b.houseId === 1);
    const b2 = HOUSE_BLUEPRINTS.find((b) => b.houseId === 2);
    if (b1 === undefined || b2 === undefined) {
      throw new Error("blueprints");
    }
    const bed1 = layoutHouseFixtures(b1).find((s) => s.kind === "bed");
    const bed2 = layoutHouseFixtures(b2).find((s) => s.kind === "bed");
    if (bed1 === undefined || bed2 === undefined) {
      throw new Error("bed slots");
    }
    expect(bed1.x).not.toBe(bed2.x);
    expect(bed1.y).not.toBe(bed2.y);
  });

  it("spawn is inside bounds and away from exit door at origin", () => {
    for (const blueprint of HOUSE_BLUEPRINTS) {
      const spawn = houseSpawnPosition(blueprint);
      const clamped = clampHousePosition(blueprint, spawn);
      expect(clamped.x).toBe(spawn.x);
      expect(clamped.y).toBe(spawn.y);
      expect(Math.hypot(spawn.x, spawn.y)).toBeGreaterThan(1.5);
    }
  });
});
