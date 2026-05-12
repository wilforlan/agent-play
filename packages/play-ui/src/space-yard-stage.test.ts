// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  layoutYardAmenityPads,
  yardSpawnPosition,
  clampYardPosition,
  YARD_BOUNDS,
  buildSpaceYardStage,
  nextEnclosedStageInputDirection,
} from "./space-yard-stage.js";

describe("space-yard-stage: layout helpers", () => {
  it("lays out three pads evenly across the yard width", () => {
    const pads = layoutYardAmenityPads([
      { kind: "shop" },
      { kind: "supermarket" },
      { kind: "car_wash" },
    ]);
    expect(pads).toHaveLength(3);
    const xs = pads.map((p) => p.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(xs[1] ?? 0);
    expect(xs[1] ?? 0).toBeLessThan(xs[2] ?? 0);
  });

  it("limits the number of pads to a maximum of three", () => {
    const pads = layoutYardAmenityPads([
      { kind: "shop" },
      { kind: "supermarket" },
      { kind: "car_wash" },
      { kind: "shop" },
    ]);
    expect(pads).toHaveLength(3);
  });

  it("places the human spawn at the gate, away from the exit door at (0,0)", () => {
    const spawn = yardSpawnPosition();
    const distance = Math.hypot(spawn.x, spawn.y);
    expect(distance).toBeGreaterThan(2);
  });

  it("clamps the player position inside the fence bounds", () => {
    const inside = clampYardPosition({ x: 4, y: 3 });
    expect(inside.x).toBeGreaterThanOrEqual(YARD_BOUNDS.minX);
    expect(inside.x).toBeLessThanOrEqual(YARD_BOUNDS.maxX);

    const farRight = clampYardPosition({ x: YARD_BOUNDS.maxX + 5, y: 0 });
    expect(farRight.x).toBeCloseTo(YARD_BOUNDS.maxX);

    const farLeft = clampYardPosition({ x: YARD_BOUNDS.minX - 5, y: 0 });
    expect(farLeft.x).toBeCloseTo(YARD_BOUNDS.minX);
  });
});

describe("space-yard-stage: buildSpaceYardStage", () => {
  it("creates a stage handle with id 'spaceYard'", () => {
    const stage = buildSpaceYardStage({
      spaceName: "SandMill Circle",
      amenities: [{ kind: "shop" }, { kind: "supermarket" }],
      cellScale: 24,
    });
    expect(stage.id).toBe("spaceYard");
  });

  it("mounts an exit door at stage-local (0, 0)", () => {
    const stage = buildSpaceYardStage({
      spaceName: "Plaza",
      amenities: [],
      cellScale: 24,
    });
    const door = stage.exitDoorAnchor;
    expect(door.x).toBe(0);
    expect(door.y).toBe(0);
  });

  it("when a viewportSize is supplied, picks a cellScale that fills the canvas", () => {
    const stage = buildSpaceYardStage({
      spaceName: "Plaza",
      amenities: [],
      viewportSize: { width: 720, height: 520 },
    });
    expect(stage.cellScale).toBeGreaterThan(50);
    expect(stage.cellScale * (YARD_BOUNDS.maxX - YARD_BOUNDS.minX)).toBeLessThanOrEqual(720 + 0.01);
  });

  it("places amenity pads far enough below the title that they do not overlap", () => {
    const pads = layoutYardAmenityPads([{ kind: "shop" }]);
    const firstPad = pads[0];
    expect(firstPad).toBeDefined();
    expect(firstPad?.y ?? 0).toBeGreaterThanOrEqual(2.4);
  });

  it("exposes setPlayerYardPosition and clamps to fence bounds", () => {
    const stage = buildSpaceYardStage({
      spaceName: "Plaza",
      amenities: [{ kind: "shop" }],
      cellScale: 24,
    });
    expect(typeof stage.setPlayerYardPosition).toBe("function");
    stage.setPlayerYardPosition({ x: 99, y: -5 }, { facing: "right", walkPhase: 0, isMoving: false });
    const reported = stage.playerYardPosition();
    expect(reported.x).toBeLessThanOrEqual(YARD_BOUNDS.maxX);
    expect(reported.y).toBeGreaterThanOrEqual(YARD_BOUNDS.minY);
  });
});

describe("space-yard-stage: nextEnclosedStageInputDirection", () => {
  const arrowsZero = { up: false, down: false, left: false, right: false };

  it("returns zero when nothing is pressed", () => {
    const dir = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0, y: 0 },
      arrowKeys: arrowsZero,
    });
    expect(dir.dx).toBe(0);
    expect(dir.dy).toBe(0);
    expect(dir.source).toBe("idle");
  });

  it("prefers the joystick vector when joystick is enabled and deflected past the dead zone", () => {
    const dir = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0.6, y: -0.3 },
      arrowKeys: { ...arrowsZero, down: true },
    });
    expect(dir.source).toBe("joystick");
    expect(dir.dx).toBeCloseTo(0.6);
  });

  it("inverts the joystick y so stick-up moves toward decreasing screen-y (toward the exit door at top)", () => {
    const stickUp = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0, y: 0.7 },
      arrowKeys: arrowsZero,
    });
    expect(stickUp.source).toBe("joystick");
    expect(stickUp.dy).toBeCloseTo(-0.7);

    const stickDown = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0, y: -0.7 },
      arrowKeys: arrowsZero,
    });
    expect(stickDown.dy).toBeCloseTo(0.7);
  });

  it("matches the arrow-key y semantics: stick-up and arrow-up both yield negative dy", () => {
    const stickUp = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0, y: 0.5 },
      arrowKeys: arrowsZero,
    });
    const arrowUp = nextEnclosedStageInputDirection({
      joystickEnabled: false,
      joystickVector: { x: 0, y: 0 },
      arrowKeys: { ...arrowsZero, up: true },
    });
    expect(Math.sign(stickUp.dy)).toBe(Math.sign(arrowUp.dy));
    expect(stickUp.dy).toBeLessThan(0);
    expect(arrowUp.dy).toBeLessThan(0);
  });

  it("ignores the joystick vector when below the dead zone", () => {
    const dir = nextEnclosedStageInputDirection({
      joystickEnabled: true,
      joystickVector: { x: 0.005, y: -0.001 },
      arrowKeys: { ...arrowsZero, right: true },
    });
    expect(dir.source).toBe("arrows");
    expect(dir.dx).toBeCloseTo(1);
    expect(dir.dy).toBeCloseTo(0);
  });

  it("ignores the joystick vector entirely when joystickEnabled is false", () => {
    const dir = nextEnclosedStageInputDirection({
      joystickEnabled: false,
      joystickVector: { x: 1, y: 0 },
      arrowKeys: { ...arrowsZero, left: true },
    });
    expect(dir.source).toBe("arrows");
    expect(dir.dx).toBeCloseTo(-1);
    expect(dir.dy).toBeCloseTo(0);
  });

  it("normalizes diagonal arrow input to unit length", () => {
    const dir = nextEnclosedStageInputDirection({
      joystickEnabled: false,
      joystickVector: { x: 0, y: 0 },
      arrowKeys: { up: true, right: true, down: false, left: false },
    });
    expect(Math.hypot(dir.dx, dir.dy)).toBeCloseTo(1);
    expect(dir.dx).toBeGreaterThan(0);
    expect(dir.dy).toBeLessThan(0);
  });
});
