/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { createEmptyParkingStreetContent } from "@agent-play/sdk/browser";
import {
  findNearestParkingBay,
  isParkingBayVacant,
  PARKING_BAY_ANCHORS,
} from "./parking-street-proximity.js";

describe("parking-street-proximity", () => {
  it("exposes four bays with two layers each", () => {
    const bays = new Set(PARKING_BAY_ANCHORS.map((a) => a.bay));
    expect(bays.size).toBe(4);
    expect(PARKING_BAY_ANCHORS.length).toBe(8);
  });

  it("finds nearest bay when player stands at anchor", () => {
    const anchor = PARKING_BAY_ANCHORS[0];
    if (anchor === undefined) {
      throw new Error("anchor");
    }
    const found = findNearestParkingBay({
      playerWorld: { x: anchor.x, y: anchor.y },
    });
    expect(found?.bay).toBe(anchor.bay);
    expect(found?.layer).toBe(anchor.layer);
  });

  it("returns null when player is far from parking anchors", () => {
    expect(
      findNearestParkingBay({ playerWorld: { x: 0, y: 0 }, maxDistance: 1 })
    ).toBeNull();
  });

  it("isParkingBayVacant is true for empty spots and false for active occupants", () => {
    const street = createEmptyParkingStreetContent();
    const spot = street.spots[0];
    if (spot === undefined) {
      throw new Error("spot");
    }
    const nowMs = Date.parse("2026-07-11T12:00:00.000Z");
    expect(
      isParkingBayVacant({
        parkingStreet: street,
        bay: spot.bay,
        layer: spot.layer,
        nowMs,
      })
    ).toBe(true);

    const occupiedStreet = {
      ...street,
      spots: street.spots.map((row) =>
        row.id === spot.id
          ? {
              ...row,
              occupant: {
                nodeId: "node-1",
                carPurchaseId: "car-1",
                displayNick: "Parked",
                colorHex: "#336699",
                model: "sedan",
                tier: "1h" as const,
                purchasedAt: "2026-07-11T11:00:00.000Z",
                expiresAt: "2026-07-11T13:00:00.000Z",
              },
            }
          : row
      ),
    };

    expect(
      isParkingBayVacant({
        parkingStreet: occupiedStreet,
        bay: spot.bay,
        layer: spot.layer,
        nowMs,
      })
    ).toBe(false);
  });

  it("isParkingBayVacant is true when occupant ticket has expired", () => {
    const street = createEmptyParkingStreetContent();
    const spot = street.spots[0];
    if (spot === undefined) {
      throw new Error("spot");
    }
    const expiredStreet = {
      ...street,
      spots: street.spots.map((row) =>
        row.id === spot.id
          ? {
              ...row,
              occupant: {
                nodeId: "node-1",
                carPurchaseId: "car-1",
                displayNick: "Parked",
                colorHex: "#336699",
                model: "sedan",
                tier: "1h" as const,
                purchasedAt: "2026-07-11T10:00:00.000Z",
                expiresAt: "2026-07-11T11:00:00.000Z",
              },
            }
          : row
      ),
    };

    expect(
      isParkingBayVacant({
        parkingStreet: expiredStreet,
        bay: spot.bay,
        layer: spot.layer,
        nowMs: Date.parse("2026-07-11T12:00:00.000Z"),
      })
    ).toBe(true);
  });
});
