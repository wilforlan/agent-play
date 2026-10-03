export type AmenityPurchaseKind = "shop" | "supermarket" | "car_wash";

export type OwnedAssetRef = {
  spaceId: string;
  amenityKind: AmenityPurchaseKind;
  itemId: string;
};

const SEP = "\u001f";

export const encodeOwnedAssetRef = (ref: OwnedAssetRef): string =>
  `${ref.spaceId}${SEP}${ref.amenityKind}${SEP}${ref.itemId}`;

export const decodeOwnedAssetRef = (raw: string): OwnedAssetRef | null => {
  const parts = raw.split(SEP);
  if (parts.length !== 3) {
    return null;
  }
  const [spaceId, amenityKind, itemId] = parts;
  if (
    spaceId === undefined ||
    amenityKind === undefined ||
    itemId === undefined ||
    spaceId.length === 0 ||
    itemId.length === 0
  ) {
    return null;
  }
  if (
    amenityKind !== "shop" &&
    amenityKind !== "supermarket" &&
    amenityKind !== "car_wash"
  ) {
    return null;
  }
  return { spaceId, amenityKind, itemId };
};

export const ownedAssetRefFromPurchase = (input: {
  spaceId: string;
  amenityKind: AmenityPurchaseKind;
  itemRef: { id: string };
}): OwnedAssetRef => ({
  spaceId: input.spaceId,
  amenityKind: input.amenityKind,
  itemId: input.itemRef.id,
});
