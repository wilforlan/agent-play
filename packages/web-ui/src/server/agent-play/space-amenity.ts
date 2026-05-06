export const SPACE_AMENITY_KINDS = ["supermarket", "shop", "car_wash"] as const;

export type SpaceAmenityKind = (typeof SPACE_AMENITY_KINDS)[number];

export function isSpaceAmenityKind(value: string): value is SpaceAmenityKind {
  return (SPACE_AMENITY_KINDS as readonly string[]).includes(value);
}

export function parseSpaceAmenityList(
  raw: readonly string[] | undefined
): SpaceAmenityKind[] | null {
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  const out: SpaceAmenityKind[] = [];
  for (const item of raw) {
    if (!isSpaceAmenityKind(item)) {
      return null;
    }
    out.push(item);
  }
  return out;
}
