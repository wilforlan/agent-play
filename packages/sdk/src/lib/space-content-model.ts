/**
 * @packageDocumentation
 * @module @agent-play/sdk/space-content-model
 *
 * Zod schemas and helpers for the **server-authoritative content** a space owns
 * inside each amenity kind, plus the **per-player wallet** that funds purchases.
 *
 * **Scope**
 * - {@link SaleStateSchema}: shared sub-record describing whether an item is
 *   still available for purchase or has already been sold (and to whom).
 * - {@link ShopItemSchema}, {@link SupermarketItemSchema}, {@link CarWashCarSchema}:
 *   the three amenity-content kinds. Each carries a `sale` block.
 * - {@link PlayerWalletSchema} + {@link createInitialPlayerWallet}: every player
 *   starts with **`$10`** ({@link DEFAULT_PLAYER_WALLET_BALANCE_USD}); the wallet
 *   is seeded lazily on first read by the server.
 * - {@link PurchaseRecordSchema}: append-only audit row stored per player.
 * - {@link isItemAvailableForPurchase}: pure helper consumed by the `purchase`
 *   RPC (server) and the item-tooltip / sprite renderers (client).
 *
 * @see ../../packages/web-ui/src/server/agent-play/session-store.ts for the
 *      session-store interface that persists these records.
 * @see ../../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts for the
 *      RPC handlers that write them.
 */
import { z } from "zod";

const NonEmpty = z.string().trim().min(1);
const IsoTimestamp = z.string().trim().min(1);
const PositivePrice = z.number().finite().positive();

/**
 * Sale state attached to every amenity content record.
 *
 * @remarks
 * Records start as `{ status: "available" }`. The `purchase` RPC flips them
 * to `{ status: "sold", soldToPlayerId, soldAt }` inside a `WATCH`/`MULTI`
 * transaction so concurrent buyers cannot both succeed.
 *
 * @example
 * ```ts
 * SaleStateSchema.parse({ status: "available" });
 * SaleStateSchema.parse({
 *   status: "sold",
 *   soldToPlayerId: "player-42",
 *   soldAt: new Date().toISOString(),
 * });
 * ```
 *
 * @public
 */
export const SaleStateSchema = z.object({
  status: z.enum(["available", "sold"]),
  soldToPlayerId: NonEmpty.optional(),
  soldAt: IsoTimestamp.optional(),
});

/** Runtime type derived from {@link SaleStateSchema}. @public */
export type SaleState = z.infer<typeof SaleStateSchema>;

/**
 * Shop amenity item — books, music, coffee.
 *
 * @remarks
 * Inserted by `addShopItem` AQL / RPC. Always starts with
 * `sale.status === "available"`. Client renders this via
 * `sprite-shop-item.ts` and the bookstore amenity stage.
 *
 * @example
 * ```ts
 * ShopItemSchema.parse({
 *   id: "shop-1",
 *   spaceId: "space-42",
 *   type: "book",
 *   name: "Hitchhiker's Guide",
 *   description: "Don't panic.",
 *   priceUsd: 12.5,
 *   createdAt: new Date().toISOString(),
 *   sale: { status: "available" },
 * });
 * ```
 *
 * @public
 */
export const ShopItemSchema = z.object({
  id: NonEmpty,
  spaceId: NonEmpty,
  type: z.enum(["book", "music", "coffee"]),
  name: NonEmpty,
  description: z.string(),
  priceUsd: PositivePrice,
  createdAt: IsoTimestamp,
  sale: SaleStateSchema,
});

/** Runtime type for {@link ShopItemSchema}. @public */
export type ShopItem = z.infer<typeof ShopItemSchema>;

/**
 * Supermarket amenity item — laid out on a 4×5 grid of slots.
 *
 * @remarks
 * `row` selects the section (1=Fruits, 2=Mens, 3=Womens, 4=Kids in the
 * client-side stage); `column` is 1..5. If the AQL caller omits `column` the
 * server picks the next free slot in that row.
 *
 * @example
 * ```ts
 * SupermarketItemSchema.parse({
 *   id: "sm-1",
 *   spaceId: "space-42",
 *   row: 1,
 *   column: 3,
 *   name: "Apple",
 *   description: "fresh",
 *   priceUsd: 1.25,
 *   createdAt: new Date().toISOString(),
 *   sale: { status: "available" },
 * });
 * ```
 *
 * @public
 */
export const SupermarketItemSchema = z.object({
  id: NonEmpty,
  spaceId: NonEmpty,
  row: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  column: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  name: NonEmpty,
  description: z.string(),
  priceUsd: PositivePrice,
  createdAt: IsoTimestamp,
  sale: SaleStateSchema,
});

/** Runtime type for {@link SupermarketItemSchema}. @public */
export type SupermarketItem = z.infer<typeof SupermarketItemSchema>;

/**
 * Hex color of the form `#rrggbb` (case-insensitive). Used by
 * {@link CarWashCarSchema.colorHex} so the client `sprite-car.ts` can render a
 * car body in the requested color.
 *
 * @internal
 */
const HexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb hex color");

/**
 * Car-wash amenity car parked in one of nine slots.
 *
 * @remarks
 * Client renders the car via `sprite-car.ts`, parameterised by `colorHex`.
 * Sold cars flip to a desaturated palette plus a `SOLD` banner overlay.
 *
 * @example
 * ```ts
 * CarWashCarSchema.parse({
 *   id: "car-1",
 *   spaceId: "space-42",
 *   slot: 5,
 *   name: "Mustang",
 *   model: "GT",
 *   year: 2023,
 *   priceUsd: 45000,
 *   colorHex: "#ff3344",
 *   createdAt: new Date().toISOString(),
 *   sale: { status: "available" },
 * });
 * ```
 *
 * @public
 */
export const CarWashCarSchema = z.object({
  id: NonEmpty,
  spaceId: NonEmpty,
  slot: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
  ]),
  name: NonEmpty,
  model: NonEmpty,
  year: z.number().int().min(1900).max(3000),
  priceUsd: PositivePrice,
  colorHex: HexColor,
  createdAt: IsoTimestamp,
  sale: SaleStateSchema,
});

/** Runtime type for {@link CarWashCarSchema}. @public */
export type CarWashCar = z.infer<typeof CarWashCarSchema>;

/**
 * Default starting balance, in USD, seeded into every new player wallet.
 *
 * @remarks
 * The session store seeds the wallet lazily on first read via
 * {@link createInitialPlayerWallet} inside an atomic `MULTI`, so two
 * simultaneous first reads still leave the balance at exactly `$10`.
 *
 * @defaultValue 10
 * @public
 */
export const DEFAULT_PLAYER_WALLET_BALANCE_USD = 10;

/**
 * Per-player wallet.
 *
 * @remarks
 * Stored at `agent-play:${hostId}:player:${playerId}:wallet`. Mutated atomically
 * by the `purchase` RPC (decrement) and by the optional AQL `SET WALLET`
 * statement.
 *
 * @public
 */
export const PlayerWalletSchema = z.object({
  playerId: NonEmpty,
  balanceUsd: z.number().finite().nonnegative(),
  currency: z.literal("USD"),
  updatedAt: IsoTimestamp,
  powerUps: z.number().int().nonnegative().default(0),
});

/** Runtime type for {@link PlayerWalletSchema}. @public */
export type PlayerWallet = z.infer<typeof PlayerWalletSchema>;

/**
 * Build a fresh wallet seeded with the {@link DEFAULT_PLAYER_WALLET_BALANCE_USD}
 * balance for an unseen player.
 *
 * @example
 * ```ts
 * const wallet = createInitialPlayerWallet({
 *   playerId: "player-42",
 *   now: new Date().toISOString(),
 * });
 * // → { playerId: "player-42", balanceUsd: 10, currency: "USD", updatedAt: ... }
 * ```
 *
 * @public
 */
export function createInitialPlayerWallet(input: {
  playerId: string;
  now: string;
}): PlayerWallet {
  return {
    playerId: input.playerId,
    balanceUsd: DEFAULT_PLAYER_WALLET_BALANCE_USD,
    currency: "USD",
    updatedAt: input.now,
    powerUps: 0,
  };
}

export function createInitialAgentRewardWallet(input: {
  playerId: string;
  now: string;
}): PlayerWallet {
  return {
    playerId: input.playerId,
    balanceUsd: 0,
    currency: "USD",
    updatedAt: input.now,
    powerUps: 0,
  };
}

/**
 * Audit record appended each time a player completes a purchase.
 *
 * @remarks
 * Stored as a Redis list at `agent-play:${hostId}:player:${playerId}:purchases`
 * with `LPUSH` so the newest entry is at index 0.
 *
 * @public
 */
export const PurchaseRecordSchema = z.object({
  id: NonEmpty,
  playerId: NonEmpty,
  spaceId: NonEmpty,
  amenityKind: z.enum([
    "shop",
    "supermarket",
    "car_wash",
    "parking",
    "house",
    "talk_time",
    "wallet_bundle",
    "apu_credit",
    "apu_debit",
  ]),
  itemRef: z.object({
    kind: z.enum([
      "shop",
      "supermarket",
      "carwash",
      "parking",
      "house",
      "game",
      "apu",
      "talk",
      "bundle",
    ]),
    id: NonEmpty,
  }),
  priceUsd: PositivePrice.optional(),
  at: IsoTimestamp,
  detail: z.string().optional(),
  powerUpsSpent: z.number().int().positive().optional(),
  powerUpsEarned: z.number().int().positive().optional(),
  powerUpsDelta: z.number().int().optional(),
  debitSource: z.string().optional(),
  creditSource: z.string().optional(),
  counterpartyNodeId: z.string().optional(),
  token: z.literal("APU").optional(),
});

/** Runtime type for {@link PurchaseRecordSchema}. @public */
export type PurchaseRecord = z.infer<typeof PurchaseRecordSchema>;

/**
 * Returns whether an amenity content record can still be purchased.
 *
 * @remarks
 * Server-side, the `purchase` RPC calls this **after** re-reading the item
 * inside the `WATCH`/`MULTI` block to make the check atomic. Client-side, the
 * tooltip and sprite renderers call it to decide between the `Buy` button and
 * the disabled `SOLD` pill.
 *
 * @example
 * ```ts
 * if (!isItemAvailableForPurchase(item)) {
 *   // render the sold view
 * }
 * ```
 *
 * @public
 */
export function isItemAvailableForPurchase(item: {
  sale: SaleState;
}): boolean {
  return item.sale.status === "available";
}

/**
 * Union of all three content kinds, useful for places where the carrier
 * doesn't need to know the specific amenity.
 *
 * @public
 */
export type SpaceContentItem = ShopItem | SupermarketItem | CarWashCar;

/**
 * Convert any 24-bit RGB color to its perceptual grey equivalent using the
 * standard luminance coefficients (`Y = 0.299·R + 0.587·G + 0.114·B`).
 *
 * @remarks
 * Used by every amenity sprite (shop card, grocery item, car) when the
 * item's `sale.status === 'sold'`. Replacing original fills with the
 * desaturated grey is the first step of the sold visual treatment;
 * `drawSoldBadge` then paints the red `SOLD` banner on top.
 *
 * The function is bit-pure: it accepts a `0xRRGGBB` integer and returns a
 * `0xGGGGGG` integer, so it composes cleanly with `pixi.js` color params.
 *
 * @example
 * ```ts
 * const grey = desaturateColor(0xff3344);
 * // grey = 0x6e6e6e (approximate)
 * ```
 *
 * @public
 */
export function desaturateColor(hex: number): number {
  const clamped = Math.max(0, Math.min(0xffffff, Math.trunc(hex)));
  const r = (clamped >> 16) & 0xff;
  const g = (clamped >> 8) & 0xff;
  const b = clamped & 0xff;
  const y = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
  return (y << 16) | (y << 8) | y;
}
