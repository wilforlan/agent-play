import { describe, expect, it } from "vitest";
import {
  ParkingSpotSchema,
  ParkingStreetContentSchema,
  createEmptyParkingStreetContent,
} from "./parking-content-model.js";

describe("ParkingStreetContentSchema", () => {
  it("parses default empty street with eight spots", () => {
    const content = createEmptyParkingStreetContent();
    expect(ParkingStreetContentSchema.parse(content).spots).toHaveLength(8);
  });

  it("parses occupied spot with nick and expiry", () => {
    const content = createEmptyParkingStreetContent();
    const spot = content.spots[0];
    if (spot === undefined) {
      throw new Error("spot");
    }
    const occupied = {
      ...spot,
      occupant: {
        nodeId: "node-1",
        carPurchaseId: "purchase-1",
        displayNick: "Red Coupe",
        colorHex: "#ff0000",
        model: "GT",
        tier: "1h" as const,
        purchasedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
      },
    };
    expect(ParkingSpotSchema.parse(occupied).occupant?.displayNick).toBe(
      "Red Coupe"
    );
  });
});
