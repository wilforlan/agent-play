import { z } from "zod";
import { DEFAULT_PARKING_RATES_USD } from "./parking-pricing.js";
import type { ParkingDurationTier } from "./parking-ownership.js";

const NonEmpty = z.string().trim().min(1);
const IsoTimestamp = z.string().trim().min(1);
const PositivePrice = z.number().finite().positive();
const HexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb hex color");

export const ParkingDurationTierSchema = z.enum([
  "1h",
  "12h",
  "1d",
  "3d",
  "7d",
  "1mo",
  "3mo",
  "1y",
  "forever",
]);

export const ParkingBaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const ParkingLayerSchema = z.union([z.literal(1), z.literal(2)]);

export const ParkingOccupantSchema = z.object({
  nodeId: NonEmpty,
  carPurchaseId: NonEmpty,
  displayNick: z.string().trim().min(1).max(24),
  colorHex: HexColor,
  model: NonEmpty,
  tier: ParkingDurationTierSchema,
  purchasedAt: IsoTimestamp,
  expiresAt: IsoTimestamp.nullable(),
});

export const ParkingSpotSchema = z.object({
  id: NonEmpty,
  bay: ParkingBaySchema,
  layer: ParkingLayerSchema,
  occupant: ParkingOccupantSchema.nullable(),
});

export const ParkingStreetContentSchema = z.object({
  spots: z.array(ParkingSpotSchema).length(8),
  rates: z.record(ParkingDurationTierSchema, PositivePrice),
});

export type ParkingSpot = z.infer<typeof ParkingSpotSchema>;
export type ParkingOccupant = z.infer<typeof ParkingOccupantSchema>;
export type ParkingStreetContent = z.infer<typeof ParkingStreetContentSchema>;

export const PARKING_BAY_COUNT = 4;
export const PARKING_LAYERS_PER_BAY = 2;
export const PARKING_SPOT_COUNT = PARKING_BAY_COUNT * PARKING_LAYERS_PER_BAY;

const spotIdFor = (bay: number, layer: number): string =>
  `parking-bay-${String(bay)}-layer-${String(layer)}`;

export const createEmptyParkingStreetContent = (): ParkingStreetContent => {
  const spots: ParkingSpot[] = [];
  for (let bay = 1; bay <= PARKING_BAY_COUNT; bay += 1) {
    for (let layer = 1; layer <= PARKING_LAYERS_PER_BAY; layer += 1) {
      spots.push({
        id: spotIdFor(bay, layer),
        bay: bay as ParkingSpot["bay"],
        layer: layer as ParkingSpot["layer"],
        occupant: null,
      });
    }
  }
  return ParkingStreetContentSchema.parse({
    spots,
    rates: { ...DEFAULT_PARKING_RATES_USD },
  });
};

export const listActiveParkingOccupancies = (
  content: ParkingStreetContent,
  nowIso: string
): Array<{
  nodeId: string;
  tier: ParkingDurationTier;
  expiresAt: string | null;
}> => {
  const active: Array<{
    nodeId: string;
    tier: ParkingDurationTier;
    expiresAt: string | null;
  }> = [];
  for (const spot of content.spots) {
    const occupant = spot.occupant;
    if (occupant === null) {
      continue;
    }
    if (occupant.expiresAt !== null && new Date(occupant.expiresAt).getTime() <= new Date(nowIso).getTime()) {
      continue;
    }
    active.push({
      nodeId: occupant.nodeId,
      tier: occupant.tier,
      expiresAt: occupant.expiresAt,
    });
  }
  return active;
};

export const findParkingSpot = (
  content: ParkingStreetContent,
  bay: ParkingSpot["bay"],
  layer: ParkingSpot["layer"]
): ParkingSpot | undefined =>
  content.spots.find((s) => s.bay === bay && s.layer === layer);
