// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildSoldBadge, soldBadgeBannerColor } from "./sprite-sold-overlay.js";

describe("sprite-sold-overlay", () => {
  it("returns a container that holds the banner graphics and SOLD label", () => {
    const container = buildSoldBadge({ width: 80, height: 60 });
    expect(container.children.length).toBeGreaterThanOrEqual(2);
  });

  it("centers the badge inside the requested bounding box", () => {
    const container = buildSoldBadge({ width: 80, height: 60 });
    expect(container.x).toBeCloseTo(40);
    expect(container.y).toBeCloseTo(30);
  });

  it("rotates the banner along the host sprite's diagonal", () => {
    const container = buildSoldBadge({ width: 100, height: 100 });
    const banner = container.children[1];
    expect(banner?.rotation).toBeCloseTo(Math.PI / 4, 3);
  });

  it("uses a custom label when provided", () => {
    const container = buildSoldBadge({
      width: 80,
      height: 60,
      label: "RESERVED",
    });
    const text = container.children.find(
      (child) =>
        typeof (child as unknown as { text?: unknown }).text === "string"
    );
    expect((text as unknown as { text: string }).text).toBe("RESERVED");
  });

  it("exposes a stable red banner color constant", () => {
    expect(typeof soldBadgeBannerColor).toBe("number");
    expect(soldBadgeBannerColor & 0xff0000).toBeGreaterThan(0);
  });
});
