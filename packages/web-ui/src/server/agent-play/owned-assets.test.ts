import { describe, expect, it } from "vitest";
import {
  decodeOwnedAssetRef,
  encodeOwnedAssetRef,
  ownedAssetRefFromPurchase,
} from "./owned-assets.js";

describe("owned-assets", () => {
  it("round-trips an owned asset ref", () => {
    const ref = {
      spaceId: "space-1",
      amenityKind: "car_wash" as const,
      itemId: "car-1",
    };
    expect(decodeOwnedAssetRef(encodeOwnedAssetRef(ref))).toEqual(ref);
  });

  it("builds a ref from a purchase input", () => {
    expect(
      ownedAssetRefFromPurchase({
        spaceId: "s",
        amenityKind: "shop",
        itemRef: { id: "item-1" },
      })
    ).toEqual({
      spaceId: "s",
      amenityKind: "shop",
      itemId: "item-1",
    });
  });

  it("rejects malformed encodings", () => {
    expect(decodeOwnedAssetRef("bad")).toBeNull();
    expect(decodeOwnedAssetRef("a\u001fhouse\u001fb")).toBeNull();
  });
});
