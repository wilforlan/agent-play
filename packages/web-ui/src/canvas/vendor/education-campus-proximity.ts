import {
  EDUCATION_CENTER_SPECS,
  buildEducationCenterAnchors,
  type EducationCampusZone,
  type EducationCenterAnchor,
} from "./education-campus-layer.js";
import type { WorldBounds } from "@agent-play/sdk/browser";

export const EDUCATION_CENTER_PROXIMITY_RADIUS = 2.2;

export const EDUCATION_CENTER_DAY_PASS_APU = 5;

export type EducationCenterProximityTarget = EducationCenterAnchor & {
  distance: number;
};

export const resolveEducationCampusBand = (input: {
  zone: EducationCampusZone;
  clampBounds: WorldBounds | null;
}): WorldBounds => {
  if (input.clampBounds === null) {
    return input.zone.rect;
  }
  return {
    minX: input.clampBounds.minX,
    maxX: input.clampBounds.maxX,
    minY: input.zone.rect.minY,
    maxY: input.zone.rect.maxY,
  };
};

export const listEducationCenterAnchorsForZone = (input: {
  zone: EducationCampusZone;
  clampBounds: WorldBounds | null;
}): readonly EducationCenterAnchor[] => {
  const bandRect = resolveEducationCampusBand(input);
  return buildEducationCenterAnchors({
    bandRect,
    zoneRect: input.zone.rect,
    centerCount: EDUCATION_CENTER_SPECS.length,
  });
};

export const findNearestEducationCenter = (input: {
  playerWorld: { x: number; y: number };
  anchors: readonly EducationCenterAnchor[];
  maxDistance?: number;
}): EducationCenterProximityTarget | null => {
  const maxDistance = input.maxDistance ?? EDUCATION_CENTER_PROXIMITY_RADIUS;
  let best: EducationCenterProximityTarget | null = null;
  for (const anchor of input.anchors) {
    const distance = Math.hypot(
      input.playerWorld.x - anchor.x,
      input.playerWorld.y - anchor.y
    );
    if (distance > maxDistance) {
      continue;
    }
    if (best === null || distance < best.distance) {
      best = { ...anchor, distance };
    }
  }
  return best;
};

export const educationCenterDayPassLabel = (centerLabel: string): string =>
  `${centerLabel} · ${String(EDUCATION_CENTER_DAY_PASS_APU)} APU day entry`;
