import { describe, expect, it } from "vitest";
import { resolveAmenityContent } from "./amenity-content-resolver";

const baseSale = { status: "available" as const };

const car = (slot: 1 | 2 | 3, name: string): {
  id: string;
  slot: 1 | 2 | 3;
  name: string;
  model: string;
  year: number;
  priceUsd: number;
  colorHex: string;
  sale: { status: "available" | "sold" };
} => ({
  id: `car-${slot}`,
  slot,
  name,
  model: "M",
  year: 2024,
  priceUsd: 100,
  colorHex: "#abcdef",
  sale: baseSale,
});

const supermarketItem = (id: string): {
  id: string;
  row: 1;
  column: 1;
  name: string;
  priceUsd: number;
  sale: { status: "available" | "sold" };
} => ({
  id,
  row: 1,
  column: 1,
  name: id,
  priceUsd: 1,
  sale: baseSale,
});

const shopItem = (id: string): {
  id: string;
  type: "book";
  name: string;
  priceUsd: number;
  sale: { status: "available" | "sold" };
} => ({
  id,
  type: "book",
  name: id,
  priceUsd: 1,
  sale: baseSale,
});

describe("resolveAmenityContent", () => {
  it("returns empty arrays when there is no snapshot", () => {
    expect(
      resolveAmenityContent({
        snapshot: null,
        spaceId: "space-1",
        kind: "car_wash",
      })
    ).toEqual({ shopItems: [], supermarketItems: [], carWashCars: [] });
  });

  it("returns empty arrays when the space is not in the snapshot", () => {
    expect(
      resolveAmenityContent({
        snapshot: { spaces: [{ id: "other-space", amenityContent: {} }] },
        spaceId: "space-1",
        kind: "car_wash",
      })
    ).toEqual({ shopItems: [], supermarketItems: [], carWashCars: [] });
  });

  it("returns the carWashCars for the requested space", () => {
    const cars = [car(1, "Mustang"), car(2, "Camaro"), car(3, "GTR")];
    const result = resolveAmenityContent({
      snapshot: {
        spaces: [
          {
            id: "space-1",
            amenityContent: { carWashCars: cars },
          },
        ],
      },
      spaceId: "space-1",
      kind: "car_wash",
    });
    expect(result.carWashCars.map((c) => c.id)).toEqual([
      "car-1",
      "car-2",
      "car-3",
    ]);
    expect(result.shopItems).toEqual([]);
    expect(result.supermarketItems).toEqual([]);
  });

  it("returns the shopItems and supermarketItems separately", () => {
    const result = resolveAmenityContent({
      snapshot: {
        spaces: [
          {
            id: "space-1",
            amenityContent: {
              shopItems: [shopItem("s1"), shopItem("s2")],
              supermarketItems: [supermarketItem("m1")],
            },
          },
        ],
      },
      spaceId: "space-1",
      kind: "shop",
    });
    expect(result.shopItems.map((i) => i.id)).toEqual(["s1", "s2"]);
    expect(result.supermarketItems.map((i) => i.id)).toEqual(["m1"]);
    expect(result.carWashCars).toEqual([]);
  });

  it("returns empty arrays when amenityContent is undefined", () => {
    const result = resolveAmenityContent({
      snapshot: { spaces: [{ id: "space-1" }] },
      spaceId: "space-1",
      kind: "car_wash",
    });
    expect(result).toEqual({
      shopItems: [],
      supermarketItems: [],
      carWashCars: [],
    });
  });

  it("ignores items whose sale or required shape is malformed", () => {
    const result = resolveAmenityContent({
      snapshot: {
        spaces: [
          {
            id: "space-1",
            amenityContent: {
              carWashCars: [
                car(1, "ok"),
                { id: "broken", slot: 999 } as unknown as ReturnType<
                  typeof car
                >,
              ],
            },
          },
        ],
      },
      spaceId: "space-1",
      kind: "car_wash",
    });
    expect(result.carWashCars.map((c) => c.id)).toEqual(["car-1"]);
  });
});
