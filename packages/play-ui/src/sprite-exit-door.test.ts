// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildExitDoorSprite,
  EXIT_DOOR_PROXIMITY_RADIUS_WORLD,
  isWithinExitDoorProximity,
} from "./sprite-exit-door.js";

describe("sprite-exit-door", () => {
  it("returns a container positioned at the stage-local origin", () => {
    const door = buildExitDoorSprite({ cellScale: 24 });
    expect(door.x).toBe(0);
    expect(door.y).toBe(0);
  });

  it("contains visible art (frame, panel, sign)", () => {
    const door = buildExitDoorSprite({ cellScale: 24 });
    expect(door.children.length).toBeGreaterThanOrEqual(3);
  });

  it("scales children with cellScale", () => {
    const small = buildExitDoorSprite({ cellScale: 16 });
    const big = buildExitDoorSprite({ cellScale: 32 });
    expect(big.scale.x).toBeGreaterThan(small.scale.x);
  });

  it("triggers when the player foot point is within the proximity radius", () => {
    expect(
      isWithinExitDoorProximity({
        playerWorld: { x: 0.4, y: 0.2 },
        doorWorld: { x: 0, y: 0 },
      })
    ).toBe(true);
    expect(
      isWithinExitDoorProximity({
        playerWorld: { x: 5, y: 5 },
        doorWorld: { x: 0, y: 0 },
      })
    ).toBe(false);
  });

  it("exposes the proximity radius constant", () => {
    expect(EXIT_DOOR_PROXIMITY_RADIUS_WORLD).toBeGreaterThan(0);
  });
});
