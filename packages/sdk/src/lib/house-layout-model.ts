import type { HouseId } from "./house-content-model.js";

export type HouseStageBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

export type HouseFixtureKind = "bed" | "wardrobe" | "mirror" | "window";

export type HouseFixtureSlot = {
  readonly kind: HouseFixtureKind;
  readonly variant: string;
  readonly x: number;
  readonly y: number;
  readonly rotation?: 0 | 90 | 180 | 270;
};

export type HouseBlueprint = {
  readonly houseId: HouseId;
  readonly label: string;
  readonly bounds: HouseStageBounds;
  readonly floor: {
    readonly color: number;
    readonly pattern: "planks" | "tiles" | "carpet";
  };
  readonly exteriorPalette: {
    readonly wall: number;
    readonly roof: number;
    readonly door: number;
    readonly window: number;
    readonly trim: number;
  };
  readonly fixtures: ReadonlyArray<{
    readonly kind: HouseFixtureKind;
    readonly variant: string;
    readonly x: number;
    readonly y: number;
    readonly rotation?: 0 | 90 | 180 | 270;
  }>;
  readonly spawn: { readonly x: number; readonly y: number };
};

const BASE_BOUNDS: HouseStageBounds = {
  minX: 0,
  minY: 0,
  maxX: 10,
  maxY: 7,
};

export const HOUSE_BLUEPRINTS: readonly HouseBlueprint[] = [
  {
    houseId: 1,
    label: "Studio layout",
    bounds: BASE_BOUNDS,
    floor: { color: 0xc4a574, pattern: "planks" },
    exteriorPalette: {
      wall: 0xf5e6c8,
      roof: 0xc62828,
      door: 0x4e342e,
      window: 0x90caf9,
      trim: 0xffffff,
    },
    fixtures: [
      { kind: "bed", variant: "single-left", x: 2, y: 1.2 },
      { kind: "wardrobe", variant: "single", x: 8.5, y: 1.5 },
      { kind: "mirror", variant: "wall", x: 5, y: 0.4 },
      { kind: "window", variant: "double", x: 1.5, y: 0.3 },
      { kind: "window", variant: "single", x: 8, y: 0.3 },
    ],
    spawn: { x: 5, y: 5.5 },
  },
  {
    houseId: 2,
    label: "Split room",
    bounds: BASE_BOUNDS,
    floor: { color: 0xb0bec5, pattern: "tiles" },
    exteriorPalette: {
      wall: 0xeceff1,
      roof: 0x37474f,
      door: 0x263238,
      window: 0xfff59d,
      trim: 0x78909c,
    },
    fixtures: [
      { kind: "bed", variant: "single-right", x: 8, y: 5 },
      { kind: "wardrobe", variant: "double", x: 1.5, y: 1.5 },
      { kind: "mirror", variant: "standing", x: 9, y: 2.5 },
      { kind: "window", variant: "single", x: 3, y: 0.3 },
      { kind: "window", variant: "single", x: 7, y: 0.3 },
    ],
    spawn: { x: 5, y: 3 },
  },
  {
    houseId: 3,
    label: "L-shaped",
    bounds: BASE_BOUNDS,
    floor: { color: 0xd7ccc8, pattern: "carpet" },
    exteriorPalette: {
      wall: 0xf3e5f5,
      roof: 0x6a1b9a,
      door: 0x4a148c,
      window: 0xe1bee7,
      trim: 0xce93d8,
    },
    fixtures: [
      { kind: "bed", variant: "single-left", x: 1.5, y: 5.5 },
      { kind: "wardrobe", variant: "single", x: 8.5, y: 5 },
      { kind: "mirror", variant: "wall", x: 5, y: 0.4 },
      { kind: "window", variant: "tall", x: 9, y: 0.3 },
      { kind: "window", variant: "double", x: 2, y: 0.3 },
    ],
    spawn: { x: 5.5, y: 2.5 },
  },
  {
    houseId: 4,
    label: "Loft",
    bounds: BASE_BOUNDS,
    floor: { color: 0x5d4037, pattern: "planks" },
    exteriorPalette: {
      wall: 0x8d6e63,
      roof: 0x3e2723,
      door: 0x212121,
      window: 0xffecb3,
      trim: 0x5d4037,
    },
    fixtures: [
      { kind: "bed", variant: "bunk", x: 7.5, y: 1 },
      { kind: "wardrobe", variant: "double", x: 2, y: 4.5 },
      { kind: "mirror", variant: "standing", x: 5, y: 4 },
      { kind: "window", variant: "tall", x: 1, y: 0.3 },
      { kind: "window", variant: "single", x: 6, y: 0.3 },
    ],
    spawn: { x: 4, y: 6 },
  },
];

export const getHouseBlueprint = (houseId: HouseId): HouseBlueprint => {
  const blueprint = HOUSE_BLUEPRINTS.find((b) => b.houseId === houseId);
  if (blueprint === undefined) {
    throw new Error(`getHouseBlueprint: unknown houseId ${String(houseId)}`);
  }
  return blueprint;
};

export const layoutHouseFixtures = (
  blueprint: HouseBlueprint
): HouseFixtureSlot[] =>
  blueprint.fixtures.map((fixture) => {
    const slot: HouseFixtureSlot = {
      kind: fixture.kind,
      variant: fixture.variant,
      x: fixture.x,
      y: fixture.y,
    };
    if (fixture.rotation !== undefined) {
      return { ...slot, rotation: fixture.rotation };
    }
    return slot;
  });

export const houseSpawnPosition = (
  blueprint: HouseBlueprint
): { x: number; y: number } => ({
  x: blueprint.spawn.x,
  y: blueprint.spawn.y,
});

export const clampHousePosition = (
  blueprint: HouseBlueprint,
  pos: { x: number; y: number }
): { x: number; y: number } => {
  const { minX, minY, maxX, maxY } = blueprint.bounds;
  return {
    x: Math.min(maxX, Math.max(minX, pos.x)),
    y: Math.min(maxY, Math.max(minY, pos.y)),
  };
};
