import { describe, expect, it } from "vitest";
import {
  createEmptyHouseStreetContent,
  findHouseSlot,
  type HouseId,
} from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";

const ISO = "2026-05-12T00:00:00.000Z";

describe("session-store: parking-lane houses", () => {
  it("returns empty house street with four catalog slots", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const street = await store.getHouseStreet();
    expect(street.houses).toHaveLength(4);
    expect(street.houses[0]?.priceUsd).toBe(1299.99);
  });

  it("buys a house when player has sufficient funds", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 5000 });
    const result = await store.buyHouse({
      nodeId: "node-a",
      houseId: 2,
      ownerName: "Alex Kim",
      ownerSignature: "AK",
      now: ISO,
      recordId: "house-purchase-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const house = findHouseSlot(result.houseStreet, 2);
    expect(house?.ownerNodeId).toBe("node-a");
    expect(house?.ownerDisplayName).toBe("Alex Kim · AK");
    expect(house?.ownerName).toBe("Alex Kim");
    expect(house?.ownerSignature).toBe("AK");
    expect(result.wallet.balanceUsd).toBe(5000 - 2199.99);
    expect(result.record.amenityKind).toBe("house");
    expect(result.record.spaceId).toBe("__houses__");
    expect(result.record.itemRef).toEqual({ kind: "house", id: "house-2" });
    expect(result.record.detail).toContain("Split room");
  });

  it("rejects purchase when house is already owned", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 10000 });
    await store.setPlayerWalletBalance({ playerId: "node-b", balanceUsd: 10000 });
    const first = await store.buyHouse({
      nodeId: "node-a",
      houseId: 1 as HouseId,
      ownerName: "First Owner",
      ownerSignature: "FO",
      now: ISO,
      recordId: "house-1",
    });
    expect(first.ok).toBe(true);
    const second = await store.buyHouse({
      nodeId: "node-b",
      houseId: 1 as HouseId,
      ownerName: "Second Owner",
      ownerSignature: "SO",
      now: ISO,
      recordId: "house-2",
    });
    expect(second).toEqual({ ok: false, error: "HOUSE_ALREADY_OWNED" });
  });

  it("rejects purchase with insufficient funds", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 100 });
    const result = await store.buyHouse({
      nodeId: "node-a",
      houseId: 4 as HouseId,
      ownerName: "Broke Buyer",
      ownerSignature: "BB",
      now: ISO,
      recordId: "house-3",
    });
    expect(result).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    const street = await store.getHouseStreet();
    expect(findHouseSlot(street, 4)?.ownerNodeId).toBeNull();
  });

  it("rejects invalid house id", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 10000 });
    const result = await store.buyHouse({
      nodeId: "node-a",
      houseId: 5 as HouseId,
      ownerName: "Ghost",
      ownerSignature: "GH",
      now: ISO,
      recordId: "house-4",
    });
    expect(result).toEqual({ ok: false, error: "INVALID_HOUSE" });
  });

  it("persists purchase in player audit list", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "node-a", balanceUsd: 8000 });
    await store.buyHouse({
      nodeId: "node-a",
      houseId: 3 as HouseId,
      ownerName: "Record Owner",
      ownerSignature: "RO",
      now: ISO,
      recordId: "house-5",
    });
    const purchases = await store.listPurchases({ playerId: "node-a", limit: 10 });
    expect(purchases[0]?.amenityKind).toBe("house");
    expect(purchases[0]?.priceUsd).toBe(3499.99);
  });
});
