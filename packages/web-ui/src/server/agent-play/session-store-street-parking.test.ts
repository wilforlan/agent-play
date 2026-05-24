import { describe, expect, it } from "vitest";
import { MINIMUM_PLAY_WORLD_BOUNDS } from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";
import { createDefaultSeededPlayLayout } from "./world-layout-bootstrap.js";

describe("SessionStore street parking", () => {
  it("parks and unparks a car at a street slot", async () => {
    const store = new TestSessionStore();
    const layout = createDefaultSeededPlayLayout();
    const slot = layout.parkingSlots?.[0];
    if (slot === undefined) {
      throw new Error("expected parking slot");
    }
    await store.appendPurchaseRecord({
      id: "purchase-car-1",
      playerId: "player-a",
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-1" },
      priceUsd: 30,
      purchasedAt: "2026-01-01T00:00:00.000Z",
    });
    await store.upsertCarWashCar({
      id: "car-1",
      slot: 1,
      name: "Blue Sedan",
      model: "Sedan",
      year: 2024,
      priceUsd: 30,
      colorHex: "#2255aa",
      description: "A blue sedan",
      sale: { status: "sold", soldToPlayerId: "player-a" },
    });
    const parked = await store.parkStreetCar({
      layout,
      playerId: "player-a",
      slotId: slot.id,
      purchaseId: "purchase-car-1",
      playerPos: { x: slot.wx, y: slot.wy },
      car: {
        colorHex: "#2255aa",
        name: "Blue Sedan",
        model: "Sedan",
      },
    });
    expect(parked.ok).toBe(true);
    const listed = await store.listStreetParking();
    expect(listed.length).toBe(1);
    expect(listed[0]?.playerId).toBe("player-a");
    const unparked = await store.unparkStreetCar({
      playerId: "player-a",
      slotId: slot.id,
      playerPos: { x: slot.wx, y: slot.wy },
    });
    expect(unparked.ok).toBe(true);
    expect(await store.listStreetParking()).toEqual([]);
  });

  it("rejects parking when the slot is already occupied", async () => {
    const store = new TestSessionStore();
    const layout = createDefaultSeededPlayLayout();
    const slot = layout.parkingSlots?.[0];
    if (slot === undefined) {
      throw new Error("expected parking slot");
    }
    await store.appendPurchaseRecord({
      id: "purchase-a",
      playerId: "player-a",
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-a" },
      priceUsd: 30,
      purchasedAt: "2026-01-01T00:00:00.000Z",
    });
    await store.appendPurchaseRecord({
      id: "purchase-b",
      playerId: "player-b",
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-b" },
      priceUsd: 30,
      purchasedAt: "2026-01-01T00:00:00.000Z",
    });
    await store.parkStreetCar({
      layout,
      playerId: "player-a",
      slotId: slot.id,
      purchaseId: "purchase-a",
      playerPos: { x: slot.wx, y: slot.wy },
      car: { colorHex: "#111111", name: "A", model: "A" },
    });
    const second = await store.parkStreetCar({
      layout,
      playerId: "player-b",
      slotId: slot.id,
      purchaseId: "purchase-b",
      playerPos: { x: slot.wx, y: slot.wy },
      car: { colorHex: "#222222", name: "B", model: "B" },
    });
    expect(second.ok).toBe(false);
    if (second.ok) {
      throw new Error("expected failure");
    }
    expect(second.error).toBe("SLOT_OCCUPIED");
  });
});
