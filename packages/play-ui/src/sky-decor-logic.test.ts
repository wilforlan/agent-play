import { describe, expect, it } from "vitest";
import {
  isPlaneOffScreen,
  nextMarqueeOffset,
  pickGreeting,
  SKY_GREETINGS,
} from "./sky-decor-logic.js";

describe("pickGreeting", () => {
  it("returns first greeting when rng is 0", () => {
    expect(pickGreeting(() => 0)).toBe(SKY_GREETINGS[0]);
  });

  it("returns last greeting when rng approaches 1", () => {
    expect(pickGreeting(() => 0.999)).toBe(SKY_GREETINGS[SKY_GREETINGS.length - 1]);
  });
});

describe("nextMarqueeOffset", () => {
  it("scrolls left by speed times dt", () => {
    expect(
      nextMarqueeOffset({
        offset: 100,
        dt: 1,
        textWidth: 200,
        bannerWidth: 180,
        speedPxPerSec: 30,
      })
    ).toBe(70);
  });

  it("wraps when text has exited the left edge", () => {
    expect(
      nextMarqueeOffset({
        offset: -220,
        dt: 1,
        textWidth: 200,
        bannerWidth: 180,
        speedPxPerSec: 30,
      })
    ).toBe(180);
  });
});

describe("isPlaneOffScreen", () => {
  it("returns true when plane nose is past the right edge", () => {
    expect(isPlaneOffScreen({ noseX: 950, viewWidth: 800 })).toBe(true);
  });

  it("returns false when still visible", () => {
    expect(isPlaneOffScreen({ noseX: 400, viewWidth: 800 })).toBe(false);
  });
});
