import { describe, expect, it } from "vitest";
import { nextAvatarMotion } from "./avatar-anim.js";

describe("nextAvatarMotion", () => {
  it("marks idle when world position unchanged", () => {
    const r = nextAvatarMotion({
      prevWorld: { x: 1, y: 2 },
      nextWorld: { x: 1, y: 2 },
      prevFacing: "right",
      prevWalkPhase: 3,
      dt: 0.016,
      stepsPerSecondWhileWalking: 6,
    });
    expect(r.isMoving).toBe(false);
    expect(r.walkPhase).toBe(3);
    expect(r.facing).toBe("right");
  });

  it("faces left when moving with negative dx", () => {
    const r = nextAvatarMotion({
      prevWorld: { x: 2, y: 0 },
      nextWorld: { x: 1, y: 0 },
      prevFacing: "right",
      prevWalkPhase: 0,
      dt: 0.016,
      stepsPerSecondWhileWalking: 6,
    });
    expect(r.isMoving).toBe(true);
    expect(r.facing).toBe("left");
  });

  it("faces right when moving with positive dx", () => {
    const r = nextAvatarMotion({
      prevWorld: { x: 0, y: 0 },
      nextWorld: { x: 0.5, y: 0 },
      prevFacing: "left",
      prevWalkPhase: 0,
      dt: 0.1,
      stepsPerSecondWhileWalking: 10,
    });
    expect(r.facing).toBe("right");
  });

  it("keeps previous facing when moving purely vertically", () => {
    const r = nextAvatarMotion({
      prevWorld: { x: 0, y: 0 },
      nextWorld: { x: 0, y: 1 },
      prevFacing: "left",
      prevWalkPhase: 0,
      dt: 0.05,
      stepsPerSecondWhileWalking: 8,
    });
    expect(r.isMoving).toBe(true);
    expect(r.facing).toBe("left");
  });

  it("advances walk phase while moving", () => {
    const r = nextAvatarMotion({
      prevWorld: { x: 0, y: 0 },
      nextWorld: { x: 0.2, y: 0 },
      prevFacing: "right",
      prevWalkPhase: 0,
      dt: 0.1,
      stepsPerSecondWhileWalking: 10,
    });
    expect(r.walkPhase).toBeGreaterThan(0);
  });
});
