// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildAmenityCarWashStage,
  CAR_WASH_SLOT_COUNT,
  carWashSpawnPosition,
  layoutCarWashSlots,
  type CarWashCarSnapshot,
} from "./amenity-carwash-stage.js";

const car = (
  id: string,
  slot: CarWashCarSnapshot["slot"],
  overrides?: Partial<CarWashCarSnapshot>
): CarWashCarSnapshot => ({
  id,
  slot,
  name: `Car ${id}`,
  model: "GT",
  year: 2024,
  priceUsd: 1999,
  colorHex: "#ff3344",
  sale: { status: "available" },
  ...overrides,
});

describe("amenity-carwash-stage: layoutCarWashSlots", () => {
  it("always returns 9 slots", () => {
    expect(layoutCarWashSlots([])).toHaveLength(CAR_WASH_SLOT_COUNT);
  });

  it("places cars into their numbered slots", () => {
    const slots = layoutCarWashSlots([car("a", 1), car("b", 5), car("c", 9)]);
    expect(slots.find((s) => s.slot === 1)?.car?.id).toBe("a");
    expect(slots.find((s) => s.slot === 5)?.car?.id).toBe("b");
    expect(slots.find((s) => s.slot === 9)?.car?.id).toBe("c");
    expect(slots.find((s) => s.slot === 2)?.car).toBeNull();
  });
});

describe("amenity-carwash-stage: spawn", () => {
  it("spawns away from the exit door at (0, 0)", () => {
    const spawn = carWashSpawnPosition();
    expect(Math.hypot(spawn.x, spawn.y)).toBeGreaterThan(2);
  });
});

describe("amenity-carwash-stage: buildAmenityCarWashStage", () => {
  it("returns a stage with id 'amenityCarWash'", () => {
    const stage = buildAmenityCarWashStage({ cellScale: 24, cars: [] });
    expect(stage.id).toBe("amenityCarWash");
  });

  it("refresh() updates the slots", () => {
    const stage = buildAmenityCarWashStage({ cellScale: 24, cars: [] });
    stage.refresh([car("a", 1), car("b", 3)]);
    const filled = stage.getSlots().filter((s) => s.car !== null);
    expect(filled).toHaveLength(2);
  });

  it("anchors the exit door at stage-local (0, 0)", () => {
    const stage = buildAmenityCarWashStage({ cellScale: 24, cars: [] });
    expect(stage.exitDoorAnchor).toEqual({ x: 0, y: 0 });
  });
});
