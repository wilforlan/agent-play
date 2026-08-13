import { describe, expect, it } from "vitest";
import { findNearestHumanPartner } from "./peer-human-proximity.js";

describe("findNearestHumanPartner", () => {
  it("returns the nearest remote human within radius", () => {
    const positions = new Map([
      ["__human__", { x: 0, y: 0 }],
      ["human-a", { x: 0.3, y: 0 }],
      ["human-b", { x: 0.6, y: 0 }],
    ]);
    expect(
      findNearestHumanPartner({
        localHumanId: "local-1",
        positions,
        remoteHumanIds: new Set(["human-a", "human-b"]),
      })
    ).toBe("human-a");
  });

  it("returns null when no remote humans are in range", () => {
    const positions = new Map([
      ["__human__", { x: 0, y: 0 }],
      ["human-a", { x: 2, y: 0 }],
    ]);
    expect(
      findNearestHumanPartner({
        localHumanId: "local-1",
        positions,
        remoteHumanIds: new Set(["human-a"]),
      })
    ).toBeNull();
  });
});
