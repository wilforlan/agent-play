import { describe, expect, it } from "vitest";
import type {
  CarWashCar,
  ShopItem,
  SupermarketItem,
} from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";

const ISO = "2026-05-12T00:00:00.000Z";

const baseShopItem = (overrides?: Partial<ShopItem>): ShopItem => ({
  id: "shop-1",
  spaceId: "space-1",
  type: "book",
  name: "Test Book",
  description: "A great book",
  priceUsd: 12.5,
  createdAt: ISO,
  sale: { status: "available" },
  ...overrides,
});

const baseSupermarketItem = (
  overrides?: Partial<SupermarketItem>
): SupermarketItem => ({
  id: "sm-1",
  spaceId: "space-1",
  row: 1,
  column: 1,
  name: "Apple",
  description: "Red apple",
  priceUsd: 1.25,
  createdAt: ISO,
  sale: { status: "available" },
  ...overrides,
});

const baseCar = (overrides?: Partial<CarWashCar>): CarWashCar => ({
  id: "car-1",
  spaceId: "space-1",
  slot: 1,
  name: "Mustang",
  model: "GT",
  year: 2023,
  priceUsd: 45000,
  colorHex: "#ff0000",
  createdAt: ISO,
  sale: { status: "available" },
  ...overrides,
});

describe("session-store: shop items", () => {
  it("round-trips an upsert and list", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem());
    const list = await store.listShopItems("space-1");
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("shop-1");
    expect(list[0]?.sale.status).toBe("available");
  });

  it("replaces an existing record on upsert with the same id", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem({ priceUsd: 10 }));
    await store.upsertShopItem(baseShopItem({ priceUsd: 99 }));
    const list = await store.listShopItems("space-1");
    expect(list.length).toBe(1);
    expect(list[0]?.priceUsd).toBe(99);
  });

  it("removes a record", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem());
    const removed = await store.removeShopItem({
      spaceId: "space-1",
      itemId: "shop-1",
    });
    expect(removed).toBe(true);
    expect((await store.listShopItems("space-1")).length).toBe(0);
  });
});

describe("session-store: supermarket items", () => {
  it("round-trips upsert + list scoped by space", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertSupermarketItem(baseSupermarketItem());
    await store.upsertSupermarketItem(
      baseSupermarketItem({ id: "sm-2", row: 2, column: 1, name: "T-Shirt" })
    );
    const list = await store.listSupermarketItems("space-1");
    expect(list.length).toBe(2);
  });

  it("does not return items from another space", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertSupermarketItem(baseSupermarketItem());
    const list = await store.listSupermarketItems("space-other");
    expect(list.length).toBe(0);
  });
});

describe("session-store: carwash cars", () => {
  it("round-trips upsert + list", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertCarWashCar(baseCar());
    const list = await store.listCarWashCars("space-1");
    expect(list.length).toBe(1);
    expect(list[0]?.colorHex).toBe("#ff0000");
  });

  it("removes a car", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertCarWashCar(baseCar());
    expect(
      await store.removeCarWashCar({ spaceId: "space-1", carId: "car-1" })
    ).toBe(true);
    expect((await store.listCarWashCars("space-1")).length).toBe(0);
  });
});

describe("session-store: wallet auto-seed", () => {
  it("first getPlayerWallet seeds at $70", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const wallet = await store.getPlayerWallet("p1");
    expect(wallet.balanceUsd).toBe(70);
    expect(wallet.currency).toBe("USD");
  });

  it("concurrent first reads still leave balance at exactly 70", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const [w1, w2] = await Promise.all([
      store.getPlayerWallet("p2"),
      store.getPlayerWallet("p2"),
    ]);
    expect(w1.balanceUsd).toBe(70);
    expect(w2.balanceUsd).toBe(70);
    const final = await store.getPlayerWallet("p2");
    expect(final.balanceUsd).toBe(70);
  });

  it("setPlayerWalletBalance overwrites the balance", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.getPlayerWallet("p1");
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 5 });
    const w = await store.getPlayerWallet("p1");
    expect(w.balanceUsd).toBe(5);
  });

  it("adjustPlayerWalletBalance applies positive and negative deltas", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.getPlayerWallet("p1");
    const after = await store.adjustPlayerWalletBalance({
      playerId: "p1",
      deltaUsd: -20,
    });
    expect(after.balanceUsd).toBe(50);
    const after2 = await store.adjustPlayerWalletBalance({
      playerId: "p1",
      deltaUsd: 5,
    });
    expect(after2.balanceUsd).toBe(55);
  });

  it("adjustPlayerWalletBalance refuses to go below zero", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.getPlayerWallet("p1");
    await expect(
      store.adjustPlayerWalletBalance({ playerId: "p1", deltaUsd: -200 })
    ).rejects.toThrow();
  });
});

describe("session-store: purchases log", () => {
  it("appends and lists purchases newest-first", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.appendPurchaseRecord({
      id: "rec-1",
      playerId: "p1",
      spaceId: "s1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "i1" },
      priceUsd: 10,
      at: "2026-05-12T00:00:00.000Z",
    });
    await store.appendPurchaseRecord({
      id: "rec-2",
      playerId: "p1",
      spaceId: "s1",
      amenityKind: "supermarket",
      itemRef: { kind: "supermarket", id: "i2" },
      priceUsd: 5,
      at: "2026-05-12T00:01:00.000Z",
    });
    const list = await store.listPurchases({ playerId: "p1", limit: 10 });
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe("rec-2");
  });
});

describe("session-store: executePurchase", () => {
  it("decrements wallet, marks item sold, and appends a purchase record", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem({ priceUsd: 20 }));
    await store.getPlayerWallet("p1");

    const result = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
      playerId: "p1",
      now: "2026-05-12T01:00:00.000Z",
      recordId: "rec-1",
    });
    if (!result.ok) throw new Error(`expected ok purchase, got ${result.error}`);
    expect(result.wallet.balanceUsd).toBe(50);
    const items = await store.listShopItems("space-1");
    expect(items[0]?.sale.status).toBe("sold");
    expect(items[0]?.sale.soldToPlayerId).toBe("p1");
    const purchases = await store.listPurchases({ playerId: "p1", limit: 10 });
    expect(purchases.length).toBe(1);
    expect(purchases[0]?.id).toBe("rec-1");
  });

  it("rejects double-purchase with ITEM_ALREADY_SOLD", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem({ priceUsd: 20 }));
    await store.getPlayerWallet("p1");
    await store.getPlayerWallet("p2");
    await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
      playerId: "p1",
      now: "2026-05-12T01:00:00.000Z",
      recordId: "rec-1",
    });
    const second = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
      playerId: "p2",
      now: "2026-05-12T01:01:00.000Z",
      recordId: "rec-2",
    });
    expect(second.ok).toBe(false);
    if (second.ok === false) {
      expect(second.error).toBe("ITEM_ALREADY_SOLD");
    }
  });

  it("rejects with INSUFFICIENT_FUNDS without flipping the item", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem({ priceUsd: 200 }));
    await store.getPlayerWallet("p1");
    const result = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
      playerId: "p1",
      now: "2026-05-12T01:00:00.000Z",
      recordId: "rec-x",
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe("INSUFFICIENT_FUNDS");
    }
    const items = await store.listShopItems("space-1");
    expect(items[0]?.sale.status).toBe("available");
    const wallet = await store.getPlayerWallet("p1");
    expect(wallet.balanceUsd).toBe(70);
  });

  it("supports supermarket and carwash kinds", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertSupermarketItem(baseSupermarketItem({ priceUsd: 5 }));
    await store.upsertCarWashCar(baseCar({ priceUsd: 10 }));
    await store.getPlayerWallet("p1");
    const r1 = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "supermarket",
      itemRef: { kind: "supermarket", id: "sm-1" },
      playerId: "p1",
      now: "2026-05-12T01:00:00.000Z",
      recordId: "rec-1",
    });
    const r2 = await store.executePurchase({
      spaceId: "space-1",
      amenityKind: "car_wash",
      itemRef: { kind: "carwash", id: "car-1" },
      playerId: "p1",
      now: "2026-05-12T01:01:00.000Z",
      recordId: "rec-2",
    });
    expect(r1.ok && r2.ok).toBe(true);
    expect((await store.listSupermarketItems("space-1"))[0]?.sale.status).toBe(
      "sold"
    );
    expect((await store.listCarWashCars("space-1"))[0]?.sale.status).toBe("sold");
    const wallet = await store.getPlayerWallet("p1");
    expect(wallet.balanceUsd).toBe(55);
  });
});

describe("session-store: deleteSpaceSidecar clears amenity content", () => {
  it("removes shop/supermarket/carwash content on sidecar wipe", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.upsertShopItem(baseShopItem());
    await store.upsertSupermarketItem(baseSupermarketItem());
    await store.upsertCarWashCar(baseCar());
    await store.deleteSpaceSidecar("space-1");
    expect((await store.listShopItems("space-1")).length).toBe(0);
    expect((await store.listSupermarketItems("space-1")).length).toBe(0);
    expect((await store.listCarWashCars("space-1")).length).toBe(0);
  });
});
