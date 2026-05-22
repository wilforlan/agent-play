/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-content-resolver
 *
 * Pure helper that picks the per-amenity content slice out of the
 * server snapshot's `spaces[i].amenityContent` block. Used by
 * `main.ts` to feed real shop / supermarket / car-wash items into the
 * amenity stage builders when the player walks into an amenity. The
 * server populates `amenityContent` via
 * {@link ../../web-ui/src/server/agent-play/play-world.ts}.
 *
 * The output uses the **snapshot** shapes the stage builders accept
 * (`ShopItemSnapshot`, `SupermarketItemSnapshot`,
 * `CarWashCarSnapshot`) — the same fields the SDK ships, minus the
 * server-only `spaceId` / `description` / `createdAt`.
 */

import type { CarWashCarSnapshot } from "./amenity-carwash-stage";
import type { ShopItemSnapshot } from "./amenity-shop-stage";
import type { SupermarketItemSnapshot } from "./amenity-supermarket-stage";

export type AmenityContentSnapshotInput = {
  spaces?: ReadonlyArray<{
    id: string;
    amenityContent?: {
      shopItems?: ReadonlyArray<unknown>;
      supermarketItems?: ReadonlyArray<unknown>;
      carWashCars?: ReadonlyArray<unknown>;
    };
  }>;
};

export type AmenityKindForResolver = "shop" | "supermarket" | "car_wash";

export type ResolvedAmenityContent = {
  shopItems: ShopItemSnapshot[];
  supermarketItems: SupermarketItemSnapshot[];
  carWashCars: CarWashCarSnapshot[];
};

const EMPTY: ResolvedAmenityContent = {
  shopItems: [],
  supermarketItems: [],
  carWashCars: [],
};

const SHOP_TYPES = new Set(["book", "music", "coffee"]);

function isSaleState(
  v: unknown
): v is { status: "available" | "sold"; soldToPlayerId?: string } {
  if (typeof v !== "object" || v === null) return false;
  const status = (v as { status?: unknown }).status;
  return status === "available" || status === "sold";
}

function toShopItem(raw: unknown): ShopItemSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.type !== "string" ||
    !SHOP_TYPES.has(r.type) ||
    typeof r.name !== "string" ||
    typeof r.priceUsd !== "number" ||
    !isSaleState(r.sale)
  ) {
    return null;
  }
  return {
    id: r.id,
    type: r.type as ShopItemSnapshot["type"],
    name: r.name,
    priceUsd: r.priceUsd,
    sale: r.sale,
  };
}

const SUPERMARKET_ROWS = new Set([1, 2, 3, 4]);
const SUPERMARKET_COLS = new Set([1, 2, 3, 4, 5]);

function toSupermarketItem(raw: unknown): SupermarketItemSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.row !== "number" ||
    !SUPERMARKET_ROWS.has(r.row) ||
    typeof r.column !== "number" ||
    !SUPERMARKET_COLS.has(r.column) ||
    typeof r.name !== "string" ||
    typeof r.priceUsd !== "number" ||
    !isSaleState(r.sale)
  ) {
    return null;
  }
  return {
    id: r.id,
    row: r.row as SupermarketItemSnapshot["row"],
    column: r.column as SupermarketItemSnapshot["column"],
    name: r.name,
    priceUsd: r.priceUsd,
    sale: r.sale,
  };
}

const CAR_WASH_SLOTS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function toCarWashCar(raw: unknown): CarWashCarSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.slot !== "number" ||
    !CAR_WASH_SLOTS.has(r.slot) ||
    typeof r.name !== "string" ||
    typeof r.model !== "string" ||
    typeof r.year !== "number" ||
    typeof r.priceUsd !== "number" ||
    typeof r.colorHex !== "string" ||
    !isSaleState(r.sale)
  ) {
    return null;
  }
  return {
    id: r.id,
    slot: r.slot as CarWashCarSnapshot["slot"],
    name: r.name,
    model: r.model,
    year: r.year,
    priceUsd: r.priceUsd,
    colorHex: r.colorHex,
    sale: r.sale,
  };
}

function compact<T>(input: ReadonlyArray<T | null>): T[] {
  return input.filter((v): v is T => v !== null);
}

/**
 * Look up the amenity content for `spaceId` in the snapshot and return
 * just the slice for `kind`. Items that fail shape validation are
 * dropped (defensive — the server is the source of truth, but this
 * keeps the renderer from crashing on a malformed row).
 */
export function resolveAmenityContent(input: {
  snapshot: AmenityContentSnapshotInput | null;
  spaceId: string;
  kind: AmenityKindForResolver;
}): ResolvedAmenityContent {
  void input.kind;
  if (input.snapshot === null) return EMPTY;
  const spaces = input.snapshot.spaces;
  if (!Array.isArray(spaces)) return EMPTY;
  const space = spaces.find((s) => s.id === input.spaceId);
  if (space === undefined || space.amenityContent === undefined) {
    return EMPTY;
  }
  const content = space.amenityContent;
  const rawShop: ReadonlyArray<unknown> = content.shopItems ?? [];
  const rawSupermarket: ReadonlyArray<unknown> = content.supermarketItems ?? [];
  const rawCars: ReadonlyArray<unknown> = content.carWashCars ?? [];
  return {
    shopItems: compact(rawShop.map(toShopItem)),
    supermarketItems: compact(rawSupermarket.map(toSupermarketItem)),
    carWashCars: compact(rawCars.map(toCarWashCar)),
  };
}
