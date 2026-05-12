import { describe, expect, it } from "vitest";
import {
  resolveNearestAmenityBuyable,
  type AmenityBuyable,
} from "./amenity-item-buyable.js";
import type { ShopItemSnapshot, ShopItemSlot } from "./amenity-shop-stage.js";
import type {
  SupermarketItemSnapshot,
  SupermarketSlot,
} from "./amenity-supermarket-stage.js";
import type {
  CarWashCarSnapshot,
  CarWashSlot,
} from "./amenity-carwash-stage.js";

const available = { status: "available" as const };

const shopSlot = (id: string): ShopItemSlot => ({
  id,
  x: 0,
  y: 0,
  item: {
    id,
    type: "book",
    name: `book ${id}`,
    priceUsd: 12,
    sale: available,
  } satisfies ShopItemSnapshot,
});

const supermarketSlot = (id: string): SupermarketSlot => ({
  id,
  row: 1,
  column: 1,
  x: 0,
  y: 0,
  item: {
    id,
    row: 1,
    column: 1,
    name: `food ${id}`,
    priceUsd: 3,
    sale: available,
  } satisfies SupermarketItemSnapshot,
});

const carSlot = (id: string): CarWashSlot => ({
  id,
  slot: 1,
  x: 0,
  y: 0,
  car: {
    id,
    slot: 1,
    name: `car ${id}`,
    model: "M",
    year: 2024,
    priceUsd: 100,
    colorHex: "#ff0000",
    sale: available,
  } satisfies CarWashCarSnapshot,
});

describe("resolveNearestAmenityBuyable", () => {
  it("returns null when the shop has no nearby item", () => {
    expect(
      resolveNearestAmenityBuyable({
        kind: "shop",
        findShop: () => null,
        findSupermarket: () => null,
        findCar: () => null,
      })
    ).toBeNull();
  });

  it("returns a shop buyable with the correct itemRef and model", () => {
    const buyable = resolveNearestAmenityBuyable({
      kind: "shop",
      findShop: () => shopSlot("shop-1"),
      findSupermarket: () => null,
      findCar: () => null,
    });
    expect(buyable).not.toBeNull();
    const b = buyable as AmenityBuyable;
    expect(b.itemRef).toEqual({ kind: "shop", id: "shop-1" });
    expect(b.tooltipModel.name).toBe("book shop-1");
    expect(b.tooltipModel.priceUsd).toBe(12);
    expect(b.tooltipModel.sale.status).toBe("available");
  });

  it("returns a supermarket buyable", () => {
    const buyable = resolveNearestAmenityBuyable({
      kind: "supermarket",
      findShop: () => null,
      findSupermarket: () => supermarketSlot("sm-1"),
      findCar: () => null,
    });
    expect(buyable?.itemRef).toEqual({ kind: "supermarket", id: "sm-1" });
    expect(buyable?.tooltipModel.name).toBe("food sm-1");
  });

  it("returns a car-wash buyable with the car-wash itemRef kind", () => {
    const buyable = resolveNearestAmenityBuyable({
      kind: "car_wash",
      findShop: () => null,
      findSupermarket: () => null,
      findCar: () => carSlot("car-1"),
    });
    expect(buyable?.itemRef).toEqual({ kind: "carwash", id: "car-1" });
    expect(buyable?.tooltipModel.name).toBe("car car-1 · M 2024");
    expect(buyable?.tooltipModel.priceUsd).toBe(100);
  });

  it("only consults the finder matching the active amenity kind", () => {
    const buyable = resolveNearestAmenityBuyable({
      kind: "car_wash",
      findShop: () => shopSlot("shop-1"),
      findSupermarket: () => supermarketSlot("sm-1"),
      findCar: () => null,
    });
    expect(buyable).toBeNull();
  });
});
