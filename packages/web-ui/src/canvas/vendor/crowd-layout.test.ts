import { describe, expect, it } from "vitest";
import { layoutCrowdClusters } from "./crowd-layout.js";

describe("layoutCrowdClusters", () => {
  it("produces clusters each with between 2 and 5 people", () => {
    const clusters = layoutCrowdClusters({
      width: 720,
      height: 520,
      seed: 0xabc,
      groundTop: 300,
      groundBottom: 500,
      clusterCountRange: [4, 8],
    });
    expect(clusters.length).toBeGreaterThanOrEqual(4);
    expect(clusters.length).toBeLessThanOrEqual(8);
    for (const c of clusters) {
      expect(c.people.length).toBeGreaterThanOrEqual(2);
      expect(c.people.length).toBeLessThanOrEqual(5);
    }
  });

  it("keeps cluster centers inside horizontal margins", () => {
    const groundTop = 280;
    const groundBottom = 500;
    const clusters = layoutCrowdClusters({
      width: 720,
      height: 520,
      seed: 99,
      groundTop,
      groundBottom,
      clusterCountRange: [3, 3],
    });
    for (const c of clusters) {
      expect(c.cx).toBeGreaterThanOrEqual(48);
      expect(c.cx).toBeLessThanOrEqual(720 - 48);
      expect(c.cy).toBeGreaterThanOrEqual(groundTop + 20);
      expect(c.cy).toBeLessThanOrEqual(groundBottom);
    }
  });
});
