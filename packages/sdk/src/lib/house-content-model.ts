import { z } from "zod";

const NonEmpty = z.string().trim().min(1);
const IsoTimestamp = z.string().trim().min(1);
const PositivePrice = z.number().finite().positive();

export const HOUSE_WORLD_X = [3, 8, 13, 18] as const;

export const HouseIdSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const ParkingHouseBaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const HOUSE_CATALOG = [
  { houseId: 1 as const, bay: 1 as const, priceUsd: 1299.99, layoutLabel: "Studio layout" },
  { houseId: 2 as const, bay: 2 as const, priceUsd: 2199.99, layoutLabel: "Split room" },
  { houseId: 3 as const, bay: 3 as const, priceUsd: 3499.99, layoutLabel: "L-shaped" },
  { houseId: 4 as const, bay: 4 as const, priceUsd: 5999.99, layoutLabel: "Loft" },
] as const;

export const HouseSlotSchema = z.object({
  id: NonEmpty,
  houseId: HouseIdSchema,
  bay: ParkingHouseBaySchema,
  worldX: z.number().finite(),
  priceUsd: PositivePrice,
  layoutId: HouseIdSchema,
  layoutLabel: NonEmpty,
  ownerNodeId: NonEmpty.nullable(),
  ownerDisplayName: z.string().trim().min(1).max(24).nullable(),
  purchasedAt: IsoTimestamp.nullable(),
});

export const HouseStreetContentSchema = z.object({
  houses: z.array(HouseSlotSchema).length(4),
});

export type HouseId = z.infer<typeof HouseIdSchema>;
export type HouseSlot = z.infer<typeof HouseSlotSchema>;
export type HouseStreetContent = z.infer<typeof HouseStreetContentSchema>;

export const PARKING_HOUSE_COUNT = 4;

const houseIdFor = (houseId: number): string => `house-${String(houseId)}`;

export const createEmptyHouseStreetContent = (): HouseStreetContent => {
  const houses: HouseSlot[] = HOUSE_CATALOG.map((entry, index) => {
    const worldX = HOUSE_WORLD_X[index];
    if (worldX === undefined) {
      throw new Error("HOUSE_WORLD_X index mismatch");
    }
    return {
      id: houseIdFor(entry.houseId),
      houseId: entry.houseId,
      bay: entry.bay,
      worldX,
      priceUsd: entry.priceUsd,
      layoutId: entry.houseId,
      layoutLabel: entry.layoutLabel,
      ownerNodeId: null,
      ownerDisplayName: null,
      purchasedAt: null,
    };
  });
  return HouseStreetContentSchema.parse({ houses });
};

export const findHouseSlot = (
  content: HouseStreetContent,
  houseId: HouseId
): HouseSlot | undefined =>
  content.houses.find((h) => h.houseId === houseId);

export const isHouseOwned = (house: HouseSlot): boolean =>
  house.ownerNodeId !== null;

export const housePurchaseDetail = (house: HouseSlot): string =>
  `House ${String(house.houseId)} · ${house.layoutLabel}`;
