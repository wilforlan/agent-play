import { describe, expect, it } from "vitest";
import { playPadStickVisualAtDirectionProgress } from "./preview-play-pad-keys.js";
import {
  screenDeltaToWorldJoystick,
  shouldClampWorldPositionWhenJoystickDriving,
  shouldClearPrimaryWaypointsWhileJoystickIdle,
} from "./preview-debug-joystick.js";

describe("playPadStickVisualAtDirectionProgress", () => {
  const max = 56;

  it("starts left sweep at -90° with stick centered", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "left",
      progress: 0,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(0);
    expect(v.offsetYPx).toBe(0);
    expect(v.rotateDeg).toBe(-90);
  });

  it("ends left sweep at full left deflection after -360° rotation", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "left",
      progress: 1,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(-max);
    expect(v.offsetYPx).toBe(0);
    expect(v.rotateDeg).toBe(-450);
  });

  it("starts right sweep at 90° with stick centered", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "right",
      progress: 0,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(0);
    expect(v.offsetYPx).toBe(0);
    expect(v.rotateDeg).toBe(90);
  });

  it("ends right sweep at full right deflection after +360° rotation", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "right",
      progress: 1,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(max);
    expect(v.offsetYPx).toBe(0);
    expect(v.rotateDeg).toBe(450);
  });

  it("interpolates rotation and offset midway through a sweep", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "left",
      progress: 0.5,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(-max / 2);
    expect(v.rotateDeg).toBe(-270);
  });
});

describe("screenDeltaToWorldJoystick", () => {
  it("maps right to positive x and up on screen to positive world y", () => {
    const max = 56;
    const v = screenDeltaToWorldJoystick(max, -max, max);
    const invSqrt2 = 1 / Math.SQRT2;
    expect(v.x).toBeCloseTo(invSqrt2, 5);
    expect(v.y).toBeCloseTo(invSqrt2, 5);
  });

  it("returns zero for tiny offsets", () => {
    const v = screenDeltaToWorldJoystick(0.5, 0.5, 56);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it("normalizes vectors longer than maxOffsetPx", () => {
    const max = 56;
    const v = screenDeltaToWorldJoystick(max * 2, 0, max);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 10);
  });
});

describe("shouldClampWorldPositionWhenJoystickDriving", () => {
  const primary = "p1";
  const other = "p2";

  it("clamps when joystick mode is not active", () => {
    expect(
      shouldClampWorldPositionWhenJoystickDriving({
        playerId: primary,
        primaryPlayerId: primary,
        joystickActive: false,
      })
    ).toBe(true);
  });

  it("does not clamp primary while joystick mode is active", () => {
    expect(
      shouldClampWorldPositionWhenJoystickDriving({
        playerId: primary,
        primaryPlayerId: primary,
        joystickActive: true,
      })
    ).toBe(false);
  });

  it("still clamps non-primary players when joystick mode is active", () => {
    expect(
      shouldClampWorldPositionWhenJoystickDriving({
        playerId: other,
        primaryPlayerId: primary,
        joystickActive: true,
      })
    ).toBe(true);
  });

  it("clamps everyone when there is no primary id", () => {
    expect(
      shouldClampWorldPositionWhenJoystickDriving({
        playerId: primary,
        primaryPlayerId: null,
        joystickActive: true,
      })
    ).toBe(true);
  });
});

describe("shouldClearPrimaryWaypointsWhileJoystickIdle", () => {
  it("clears when joystick is active and stick is centered", () => {
    expect(
      shouldClearPrimaryWaypointsWhileJoystickIdle({
        joystickActive: true,
        joyVectorLength: 0,
      })
    ).toBe(true);
  });

  it("does not clear while stick is deflected", () => {
    expect(
      shouldClearPrimaryWaypointsWhileJoystickIdle({
        joystickActive: true,
        joyVectorLength: 0.5,
      })
    ).toBe(false);
  });

  it("does not clear when joystick mode is off", () => {
    expect(
      shouldClearPrimaryWaypointsWhileJoystickIdle({
        joystickActive: false,
        joyVectorLength: 0,
      })
    ).toBe(false);
  });
});
