// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  findNearestProximityPartner,
  findNearestStructureProximityTarget,
  DEFAULT_PROXIMITY_RADIUS,
  DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
} from "./proximity-interaction.js";

describe("arcade proximity precedence", () => {
  it("prefers agent partner over game cabinet when both are in range", () => {
    const positions = new Map<string, { x: number; y: number }>([
      ["__human__", { x: 0, y: 0 }],
      ["agent-1", { x: 0.5, y: 0 }],
    ]);
    const partner = findNearestProximityPartner({
      primaryId: "__human__",
      positions,
      radius: DEFAULT_PROXIMITY_RADIUS,
      allowedPartnerIds: new Set(["agent-1"]),
    });
    expect(partner).toBe("agent-1");

    const cabinet = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "arcade-1", x: 0.6, y: 0, gameId: "hidden-gems" },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(cabinet?.gameId).toBe("hidden-gems");
    expect(partner).not.toBeNull();
  });

  it("selects game cabinet when no agent partner is nearby", () => {
    const cabinet = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "space-1", x: 2, y: 0, spaceIds: ["sp-1"] },
        { id: "arcade-1", x: 0.5, y: 0, gameId: "price-check", name: "Price Tag" },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(cabinet?.gameId).toBe("price-check");
  });
});
