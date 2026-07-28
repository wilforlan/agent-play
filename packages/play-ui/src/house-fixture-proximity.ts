import type { HouseFixtureKind, HouseFixtureSlot } from "@agent-play/sdk/browser";
import { findNearestSlot } from "./amenity-stage-base.js";

export const HOUSE_FIXTURE_PROXIMITY_RADIUS = 1.75;

const LABELS: Readonly<Record<HouseFixtureKind, string>> = {
  bed: "Bed",
  wardrobe: "Wardrobe",
  mirror: "Mirror",
  window: "Window",
};

export type NearbyHouseFixture = HouseFixtureSlot & {
  readonly label: string;
};

export const houseFixtureDisplayLabel = (kind: HouseFixtureKind): string =>
  LABELS[kind];

export const estimateHouseFixtureCalloutHalfWidthPx = (options: {
  label: string;
  fontSizePx: number;
}): number =>
  Math.max(18, Math.ceil(options.label.length * options.fontSizePx * 0.34));

export const resolveHouseFixtureCalloutPosition = (options: {
  fixtureXPx: number;
  fixtureYPx: number;
  labelHalfWidthPx: number;
  labelHeightPx: number;
  stageWidthPx: number;
  stageHeightPx: number;
  preferAboveOffsetPx: number;
  marginPx?: number;
}): { x: number; y: number } => {
  const marginPx = options.marginPx ?? 6;
  const halfW = Math.max(0, options.labelHalfWidthPx);
  const labelH = Math.max(1, options.labelHeightPx);
  const minX = marginPx + halfW;
  const maxX = Math.max(minX, options.stageWidthPx - marginPx - halfW);
  const minY = marginPx + labelH;
  const maxY = Math.max(minY, options.stageHeightPx - marginPx);

  const x = Math.min(Math.max(options.fixtureXPx, minX), maxX);

  const aboveY = options.fixtureYPx - options.preferAboveOffsetPx;
  const belowY = options.fixtureYPx + options.preferAboveOffsetPx + labelH;
  const yUnclamped = aboveY < minY ? belowY : aboveY;
  const y = Math.min(Math.max(yUnclamped, minY), maxY);

  return { x, y };
};

export const findNearestHouseFixture = (options: {
  fixtures: ReadonlyArray<HouseFixtureSlot>;
  player: { x: number; y: number };
  radius?: number;
}): NearbyHouseFixture | null => {
  const nearest = findNearestSlot(
    options.fixtures,
    options.player,
    options.radius ?? HOUSE_FIXTURE_PROXIMITY_RADIUS
  );
  if (nearest === null) return null;
  return {
    ...nearest,
    label: houseFixtureDisplayLabel(nearest.kind),
  };
};
