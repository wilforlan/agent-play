/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  createSkyDecorLayer,
  SKY_PLANE_ANIMATION_ENABLED,
} from "./sky-decor.js";

describe("sky-decor", () => {
  it("does not spawn or move planes while airplane animation is off", () => {
    expect(SKY_PLANE_ANIMATION_ENABLED).toBe(false);
    const layer = createSkyDecorLayer({
      width: 400,
      height: 800,
      grassBandTopRatio: 0.2,
    });
    expect(layer.container.children.length).toBe(0);
    layer.tick(500);
    expect(layer.container.children.length).toBe(0);
  });
});
