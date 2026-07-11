import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARKING_RATES_USD,
  createEmptyParkingStreetContent,
  findParkingSpot,
  type CarWashCar,
} from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";

const ISO = "2026-05-12T00:00:00.000Z";

const baseCar = (overrides?: Partial<CarWashCar>): CarWashCar => ({
  id: "car-1",
  spaceId: "space-1",
  slot: 1,
  name: "Mustang",
  model: "GT",
  year: 2023,
  priceUsd: 25,
  colorHex: "#ff0000",
  createdAt: ISO,
  sale: { status: "available" },
  ...overrides,
});

const seedWalletCar = async (
  store: TestSessionStore,
  playerId: string
): Promise<string> => {
  await store.setPlayerWalletBalance({ playerId, balanceUsd: 100 });
  await store.upsertCarWashCar(baseCar());
  const purchase = await store.executePurchase({
    spaceId: "space-1",
    amenityKind: "car_wash",
    itemRef: { kind: "carwash", id: "car-1" },
    playerId,
    now: ISO,
    recordId: "purchase-car-1",
  });
  if (!purchase.ok) {
    throw new Error("seed purchase failed");
  }
  return purchase.record.id;
};

describe("session-store: parking street", () => {
  it("returns empty parking street by default", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const street = await store.getParkingStreet();
    expect(street.spots).toHaveLength(8);
    expect(street.rates["1h"]).toBe(DEFAULT_PARKING_RATES_USD["1h"]);
  });

  it("buys a timed parking ticket when player owns a car", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const carPurchaseId = await seedWalletCar(store, "node-a");
    const result = await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 1,
      layer: 1,
      carPurchaseId,
      durationTier: "1h",
      displayNick: "Red Coupe",
      now: ISO,
      recordId: "park-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const spot = findParkingSpot(result.parkingStreet, 1, 1);
    expect(spot?.occupant?.displayNick).toBe("Red Coupe");
    expect(spot?.occupant?.nodeId).toBe("node-a");
    expect(result.wallet.balanceUsd).toBe(
      100 - 25 - DEFAULT_PARKING_RATES_USD["1h"]
    );
  });

  it("rejects purchase without wallet car", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 50 });
    const result = await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 1,
      layer: 1,
      carPurchaseId: "missing",
      durationTier: "1h",
      displayNick: "Ghost",
      now: ISO,
      recordId: "park-2",
    });
    expect(result).toEqual({ ok: false, error: "NO_WALLET_CAR" });
  });

  it("rejects third timed spot for same node", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 200 });
    await store.upsertCarWashCar(baseCar({ id: "car-1", slot: 1 }));
    await store.upsertCarWashCar(baseCar({ id: "car-2", slot: 2, colorHex: "#00ff00" }));
    await store.upsertCarWashCar(baseCar({ id: "car-3", slot: 3, colorHex: "#0000ff" }));
    const p1 = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-1" },
      playerId: "node-a",
      now: ISO,
      recordId: "p1",
    });
    const p2 = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-2" },
      playerId: "node-a",
      now: ISO,
      recordId: "p2",
    });
    const p3 = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-3" },
      playerId: "node-a",
      now: ISO,
      recordId: "p3",
    });
    if (!p1.ok || !p2.ok || !p3.ok) {
      throw new Error("seed failed");
    }
    await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 1,
      layer: 1,
      carPurchaseId: p1.record.id,
      durationTier: "1h",
      displayNick: "A",
      now: ISO,
      recordId: "park-a",
    });
    await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 2,
      layer: 1,
      carPurchaseId: p2.record.id,
      durationTier: "1h",
      displayNick: "B",
      now: ISO,
      recordId: "park-b",
    });
    const third = await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 3,
      layer: 1,
      carPurchaseId: p3.record.id,
      durationTier: "1h",
      displayNick: "C",
      now: ISO,
      recordId: "park-c",
    });
    expect(third).toEqual({ ok: false, error: "PARKING_OWNERSHIP_LIMIT" });
  });

  it("clears expired occupants on tick", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const carPurchaseId = await seedWalletCar(store, "node-a");
    await store.buyParkingTicket({
      nodeId: "node-a",
      bay: 4,
      layer: 2,
      carPurchaseId,
      durationTier: "1h",
      displayNick: "Temp",
      now: "2026-01-01T00:00:00.000Z",
      recordId: "park-exp",
    });
    const cleared = await store.tickParkingExpiry("2026-01-01T02:00:00.000Z");
    const spot = findParkingSpot(cleared, 4, 2);
    expect(spot?.occupant).toBeNull();
  });
});
