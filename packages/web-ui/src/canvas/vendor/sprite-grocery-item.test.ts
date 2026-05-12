// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildGroceryItemSprite,
  resolveGroceryVariant,
  type GrocerySpriteVariant,
} from "./sprite-grocery-item.js";

describe("sprite-grocery-item: variant resolver", () => {
  it.each([
    ["Apple", 1, "apple"],
    ["banana", 1, "banana"],
    ["Strawberry", 1, "strawberry"],
    ["Cucumber", 1, "cucumber"],
    ["Mango", 1, "mango"],
    ["Tomato", 1, "tomato"],
    ["Men T-shirt", 2, "tshirt-mens"],
    ["Women hat", 3, "hat-womens"],
    ["Kid Sneakers", 4, "shoes-kids"],
    ["Sunglasses", 2, "sunglasses"],
  ] as ReadonlyArray<readonly [string, 1 | 2 | 3 | 4, GrocerySpriteVariant]>)(
    "maps name=%j row=%i to %s",
    (name, row, expected) => {
      expect(resolveGroceryVariant({ name, row })).toBe(expected);
    }
  );

  it("falls back to the row's default when no keyword matches", () => {
    expect(resolveGroceryVariant({ name: "Mystery", row: 1 })).toBe("apple");
    expect(resolveGroceryVariant({ name: "Mystery", row: 2 })).toBe(
      "tshirt-mens"
    );
    expect(resolveGroceryVariant({ name: "Mystery", row: 3 })).toBe(
      "tshirt-womens"
    );
    expect(resolveGroceryVariant({ name: "Mystery", row: 4 })).toBe(
      "tshirt-kids"
    );
  });
});

describe("sprite-grocery-item: builder", () => {
  it("returns a container with at least the body and label", () => {
    const sprite = buildGroceryItemSprite({
      variant: "apple",
      sold: false,
      label: "Apple",
    });
    expect(sprite.children.length).toBeGreaterThanOrEqual(2);
  });

  it("adds a sold overlay when sold is true", () => {
    const available = buildGroceryItemSprite({
      variant: "banana",
      sold: false,
      label: "Banana",
    });
    const sold = buildGroceryItemSprite({
      variant: "banana",
      sold: true,
      label: "Banana",
    });
    expect(sold.children.length).toBeGreaterThan(available.children.length);
  });
});
