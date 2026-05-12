import { describe, expect, it } from "vitest";
import type { ShopItem, SupermarketItem, CarWashCar } from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";
import { PlayWorld } from "./play-world.js";

const ISO = "2026-05-12T00:00:00.000Z";

const shopItem = (spaceId: string, id: string): ShopItem => ({
  id,
  spaceId,
  type: "book",
  name: "A Book",
  description: "A great book",
  priceUsd: 12.5,
  createdAt: ISO,
  sale: { status: "available" },
});

const supermarketItem = (
  spaceId: string,
  id: string,
  row: 1 | 2 | 3 | 4 = 1,
  column: 1 | 2 | 3 | 4 | 5 = 1
): SupermarketItem => ({
  id,
  spaceId,
  row,
  column,
  name: "Apple",
  description: "Fresh",
  priceUsd: 1.25,
  createdAt: ISO,
  sale: { status: "available" },
});

const car = (spaceId: string, id: string, slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 1): CarWashCar => ({
  id,
  spaceId,
  slot,
  name: "Mustang",
  model: "GT",
  year: 2024,
  priceUsd: 45000,
  colorHex: "#ff0000",
  createdAt: ISO,
  sale: { status: "available" },
});

describe("PlayWorld snapshot amenityContent hydration", () => {
  it("populates shop items for shop-amenity spaces", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const bookstore = await w.registerSpaceNode({
      name: "Bookstore",
      designKey: "shop-v1",
      amenities: ["shop"],
    });
    await store.upsertShopItem(shopItem(bookstore.id, "shop-1"));

    const snap = await w.getSnapshotJson();
    const entry = snap.spaces?.find((s) => s.id === bookstore.id);
    expect(entry?.amenityContent?.shopItems?.length).toBe(1);
    expect(entry?.amenityContent?.shopItems?.[0]?.id).toBe("shop-1");
  });

  it("populates supermarket items for supermarket-amenity spaces", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const grocer = await w.registerSpaceNode({
      name: "Grocer",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    await store.upsertSupermarketItem(supermarketItem(grocer.id, "sm-1"));

    const snap = await w.getSnapshotJson();
    const entry = snap.spaces?.find((s) => s.id === grocer.id);
    expect(entry?.amenityContent?.supermarketItems?.length).toBe(1);
  });

  it("populates car-wash cars for car_wash spaces", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const lot = await w.registerSpaceNode({
      name: "Lot",
      designKey: "car-wash-v1",
      amenities: ["car_wash"],
    });
    await store.upsertCarWashCar(car(lot.id, "car-1"));

    const snap = await w.getSnapshotJson();
    const entry = snap.spaces?.find((s) => s.id === lot.id);
    expect(entry?.amenityContent?.carWashCars?.length).toBe(1);
  });

  it("omits amenityContent when no records exist for the amenity", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const bookstore = await w.registerSpaceNode({
      name: "Bookstore",
      designKey: "shop-v1",
      amenities: ["shop"],
    });
    const snap = await w.getSnapshotJson();
    const entry = snap.spaces?.find((s) => s.id === bookstore.id);
    expect(entry?.amenityContent).toBeUndefined();
  });
});
