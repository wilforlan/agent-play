// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildShopItemSprite,
  shopItemTypeColor,
  type ShopItemSpriteType,
} from "./sprite-shop-item.js";

describe("sprite-shop-item", () => {
  it("returns a container with art and label children", () => {
    const sprite = buildShopItemSprite({
      type: "book",
      sold: false,
      label: "Hitchhiker",
    });
    expect(sprite.children.length).toBeGreaterThanOrEqual(2);
  });

  it.each<ShopItemSpriteType>(["book", "music", "coffee"])(
    "exposes a distinct band color per type for %s",
    (type) => {
      expect(shopItemTypeColor(type)).toBeGreaterThan(0);
    }
  );

  it("renders different band colors for book, music, and coffee", () => {
    const book = shopItemTypeColor("book");
    const music = shopItemTypeColor("music");
    const coffee = shopItemTypeColor("coffee");
    expect(new Set([book, music, coffee]).size).toBe(3);
  });

  it("appends a SOLD overlay when sold is true", () => {
    const available = buildShopItemSprite({
      type: "book",
      sold: false,
      label: "x",
    });
    const sold = buildShopItemSprite({
      type: "book",
      sold: true,
      label: "x",
    });
    expect(sold.children.length).toBeGreaterThan(available.children.length);
  });
});
