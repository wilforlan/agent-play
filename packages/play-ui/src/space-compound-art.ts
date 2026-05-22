/**
 * @module @agent-play/play-ui/space-compound-art
 * Helpers for rendering space-backed structure compounds on the preview canvas.
 */

export type SpaceCompoundAmenitySource = {
  readonly primaryAmenity?: string;
  readonly amenities?: readonly string[];
};

export function countAmenitiesInSpaceCompound(
  group: readonly SpaceCompoundAmenitySource[]
): number {
  const union = new Set<string>();
  for (const st of group) {
    if (st.amenities !== undefined) {
      for (const a of st.amenities) {
        if (a.length > 0) {
          union.add(a);
        }
      }
    }
    if (
      st.primaryAmenity !== undefined &&
      st.primaryAmenity.length > 0
    ) {
      union.add(st.primaryAmenity);
    }
  }
  if (union.size > 0) {
    return union.size;
  }
  return group.length;
}

export function representativePrimaryAmenityForCompound(
  group: readonly SpaceCompoundAmenitySource[]
): string {
  const primaries = group
    .map((g) => g.primaryAmenity)
    .filter((a): a is string => a !== undefined && a.length > 0);
  if (primaries.includes("supermarket")) {
    return "supermarket";
  }
  if (primaries.includes("car_wash")) {
    return "car_wash";
  }
  const first = primaries[0];
  if (first !== undefined) {
    return first;
  }
  return "shop";
}
