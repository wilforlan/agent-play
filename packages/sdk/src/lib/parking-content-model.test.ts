import { describe, expect, it } from "vitest";
import {
  ParkingSpotSchema,
  ParkingStreetContentSchema,
  createEmptyParkingStreetContent,
  effectiveParkingStreet,
  findParkingSpot,
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

describe("effectiveParkingStreet", () => {
  const occupant = {
    nodeId: "node-1",
    carPurchaseId: "purchase-1",
    displayNick: "Red Coupe",
    colorHex: "#ff0000",
    model: "GT",
    tier: "1h" as const,
    purchasedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T01:00:00.000Z",
  };

  it("clears expired timed occupants", () => {
    const content = createEmptyParkingStreetContent();
    const spot = content.spots[0];
    if (spot === undefined) {
      throw new Error("spot");
    }
    const street = ParkingStreetContentSchema.parse({
      ...content,
      spots: content.spots.map((s) =>
        s.id === spot.id ? { ...s, occupant } : s
      ),
    });
    const effective = effectiveParkingStreet(
      street,
      "2026-01-01T02:00:00.000Z"
    );
    expect(findParkingSpot(effective, spot.bay, spot.layer)?.occupant).toBeNull();
  });

  it("preserves unexpired and forever occupants", () => {
    const content = createEmptyParkingStreetContent();
    const timedSpot = content.spots[0];
    const foreverSpot = content.spots[1];
    if (timedSpot === undefined || foreverSpot === undefined) {
      throw new Error("spots");
    }
    const street = ParkingStreetContentSchema.parse({
      ...content,
      spots: content.spots.map((s) => {
        if (s.id === timedSpot.id) {
          return { ...s, occupant };
        }
        if (s.id === foreverSpot.id) {
          return {
            ...s,
            occupant: { ...occupant, tier: "forever" as const, expiresAt: null },
          };
        }
        return s;
      }),
    });
    const effective = effectiveParkingStreet(
      street,
      "2026-01-01T00:30:00.000Z"
    );
    expect(
      findParkingSpot(effective, timedSpot.bay, timedSpot.layer)?.occupant
        ?.displayNick
    ).toBe("Red Coupe");
    expect(
      findParkingSpot(effective, foreverSpot.bay, foreverSpot.layer)?.occupant
        ?.tier
    ).toBe("forever");
  });
});
