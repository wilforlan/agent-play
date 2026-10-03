/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-item-buyable
 *
 * Pure helper that maps the "nearest item the player can buy" from the
 * three amenity stages onto the tooltip model + `itemRef` shape the
 * purchase RPC expects. Lets `main.ts` use one branch-free call site to
 * drive both the `P: Buy` prompt and the tooltip's `Buy` button.
 *
 * @see ./item-tooltip.ts — render target for {@link AmenityBuyable.tooltipModel}.
 * @see ./purchase-client.ts — consumer of {@link AmenityBuyable.itemRef}.
 */

import { getEffectiveSalePriceUsd } from "@agent-play/sdk/browser";
import type { ShopItemSlot } from "./amenity-shop-stage.js";
import type { SupermarketSlot } from "./amenity-supermarket-stage.js";
import type { CarWashSlot } from "./amenity-carwash-stage.js";
import { amenityOwnershipFlags } from "./amenity-ownership.js";
import type { ItemTooltipModel } from "./item-tooltip.js";
import type { PurchaseItemRef } from "./purchase-client.js";

/**
 * The item the player is currently near inside an amenity, in the
 * shape needed to render the tooltip and execute a purchase.
 *
 * @public
 */
export type AmenityBuyable = {
  readonly tooltipModel: ItemTooltipModel;
  readonly itemRef: PurchaseItemRef;
};

type SaleLike = {
  status: "available" | "sold" | "transfer_available";
  soldToPlayerId?: string;
};

type ResolveBuyableOptions = {
  viewerPlayerId?: string | null;
  resolveOwnerDisplayName?: (playerId: string) => string;
};

const transferNoteForSale = (sale: { status: string }): string | undefined => {
  if (sale.status !== "transfer_available") {
    return undefined;
  }
  return "Transfer sale · previous owner listing";
};

const ownerFieldsForSale = (
  sale: SaleLike,
  options: ResolveBuyableOptions
): Pick<ItemTooltipModel, "ownerDisplayName" | "ownedByViewer"> => {
  const viewerPlayerId = options.viewerPlayerId ?? null;
  const flags = amenityOwnershipFlags({ sale, viewerPlayerId });
  const ownerId = sale.soldToPlayerId?.trim() ?? "";
  if (ownerId.length === 0) {
    return { ownedByViewer: flags.mine };
  }
  const resolve = options.resolveOwnerDisplayName;
  const ownerDisplayName =
    resolve !== undefined ? resolve(ownerId) : ownerId;
  return {
    ownedByViewer: flags.mine,
    ownerDisplayName,
  };
};

const shopToBuyable = (
  slot: ShopItemSlot,
  options: ResolveBuyableOptions
): AmenityBuyable => ({
  tooltipModel: {
    name: slot.item.name,
    priceUsd: getEffectiveSalePriceUsd(slot.item),
    sale: slot.item.sale,
    transferSaleNote: transferNoteForSale(slot.item.sale),
    ...ownerFieldsForSale(slot.item.sale, options),
  },
  itemRef: { kind: "shop", id: slot.item.id },
});

const supermarketToBuyable = (
  slot: SupermarketSlot & { item: NonNullable<SupermarketSlot["item"]> },
  options: ResolveBuyableOptions
): AmenityBuyable => ({
  tooltipModel: {
    name: slot.item.name,
    priceUsd: getEffectiveSalePriceUsd(slot.item),
    sale: slot.item.sale,
    transferSaleNote: transferNoteForSale(slot.item.sale),
    ...ownerFieldsForSale(slot.item.sale, options),
  },
  itemRef: { kind: "supermarket", id: slot.item.id },
});

const carWashToBuyable = (
  slot: CarWashSlot & { car: NonNullable<CarWashSlot["car"]> },
  options: ResolveBuyableOptions
): AmenityBuyable => ({
  tooltipModel: {
    name: `${slot.car.name} · ${slot.car.model} ${String(slot.car.year)}`,
    priceUsd: getEffectiveSalePriceUsd(slot.car),
    sale: slot.car.sale,
    transferSaleNote: transferNoteForSale(slot.car.sale),
    ...ownerFieldsForSale(slot.car.sale, options),
  },
  itemRef: { kind: "carwash", id: slot.car.id },
});

/**
 * Return the {@link AmenityBuyable} for the amenity kind, or `null` if
 * the player is not near a purchasable item.
 *
 * @public
 */
export const resolveNearestAmenityBuyable = (input: {
  kind: "shop" | "supermarket" | "car_wash";
  findShop: () => ShopItemSlot | null;
  findSupermarket: () => SupermarketSlot | null;
  findCar: () => CarWashSlot | null;
  viewerPlayerId?: string | null;
  resolveOwnerDisplayName?: (playerId: string) => string;
}): AmenityBuyable | null => {
  const options: ResolveBuyableOptions = {
    viewerPlayerId: input.viewerPlayerId,
    resolveOwnerDisplayName: input.resolveOwnerDisplayName,
  };
  if (input.kind === "shop") {
    const slot = input.findShop();
    return slot === null ? null : shopToBuyable(slot, options);
  }
  if (input.kind === "supermarket") {
    const slot = input.findSupermarket();
    if (slot === null || slot.item === null) return null;
    return supermarketToBuyable(
      slot as SupermarketSlot & { item: NonNullable<SupermarketSlot["item"]> },
      options
    );
  }
  const slot = input.findCar();
  if (slot === null || slot.car === null) return null;
  return carWashToBuyable(
    slot as CarWashSlot & { car: NonNullable<CarWashSlot["car"]> },
    options
  );
};
