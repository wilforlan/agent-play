import { describe, expect, it } from "vitest";
import { findParkingSpot } from "@agent-play/sdk";
import { hydrateStreetSidecars } from "./hydrate-street-sidecars.js";
import { TestSessionStore } from "./session-store.test-double.js";
import { emptySnapshot } from "./world-snapshot-helpers.js";

describe("hydrateStreetSidecars", () => {
  it("clears expired parking occupants and sets parkingChanged", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 100 });
    await store.upsertCarWashCar({
      id: "car-1",
      spaceId: "space-1",
      slot: 1,
      name: "Mustang",
      model: "GT",
      year: 2023,
      priceUsd: 25,
      colorHex: "#ff0000",
      createdAt: "2026-01-01T00:00:00.000Z",
      sale: { status: "available" },
    });
    const purchase = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-1" },
      playerId: "node-a",
      now: "2026-01-01T00:00:00.000Z",
      recordId: "purchase-car-1",
    });
    if (!purchase.ok) {
      throw new Error("seed failed");
    }
    await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 3,
      layer: 1,
      carPurchaseId: purchase.record.id,
      durationTier: "1h",
      displayNick: "Temp",
      now: "2026-01-01T00:00:00.000Z",
      recordId: "park-exp",
    });
    const base = emptySnapshot("genesis");
    const result = await hydrateStreetSidecars(
      store,
      base,
      "2026-01-01T02:00:00.000Z"
    );
    expect(result.parkingChanged).toBe(true);
    const spot = findParkingSpot(result.snapshot.parkingStreet!, 3, 1);
    expect(spot?.occupant).toBeNull();
    expect(result.snapshot.houseStreet).toBeDefined();
  });

  it("returns parkingChanged false when parking is already clear", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const base = emptySnapshot("genesis");
    const result = await hydrateStreetSidecars(
      store,
      base,
      "2026-01-01T00:00:00.000Z"
    );
    expect(result.parkingChanged).toBe(false);
    expect(result.snapshot.parkingStreet?.spots).toHaveLength(8);
  });
});
