import { describe, expect, it } from "vitest";
import { shouldPublishPose } from "./pose-publish.js";
import type { GeographyPose } from "./schemas.js";

const pose = (overrides?: Partial<GeographyPose>): GeographyPose => ({
  id: "h1",
  name: "Ada",
  x: 0,
  y: 0,
  ...overrides,
});

describe("shouldPublishPose", () => {
  it("publishes first sample", () => {
    expect(
      shouldPublishPose({
        previous: null,
        next: pose(),
        nowMs: 1000,
        lastPublishMs: null,
      }).shouldPublish
    ).toBe(true);
  });

  it("respects max hz", () => {
    expect(
      shouldPublishPose({
        previous: pose(),
        next: pose({ x: 10 }),
        nowMs: 1010,
        lastPublishMs: 1000,
        maxHz: 20,
      })
    ).toMatchObject({ shouldPublish: false, reason: "skip" });
  });

  it("publishes on distance and facing", () => {
    expect(
      shouldPublishPose({
        previous: pose(),
        next: pose({ x: 1 }),
        nowMs: 1100,
        lastPublishMs: 1000,
        maxHz: 20,
      }).reason
    ).toBe("delta");
    expect(
      shouldPublishPose({
        previous: pose({ facing: "left" }),
        next: pose({ facing: "right" }),
        nowMs: 1100,
        lastPublishMs: 1000,
      }).reason
    ).toBe("facing");
  });
});
