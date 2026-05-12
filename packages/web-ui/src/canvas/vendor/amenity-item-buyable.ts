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

import type { ShopItemSlot } from "./amenity-shop-stage.js";
import type { SupermarketSlot } from "./amenity-supermarket-stage.js";
import type { CarWashSlot } from "./amenity-carwash-stage.js";
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

const shopToBuyable = (slot: ShopItemSlot): AmenityBuyable => ({
  tooltipModel: {
    name: slot.item.name,
    priceUsd: slot.item.priceUsd,
    sale: slot.item.sale,
  },
  itemRef: { kind: "shop", id: slot.item.id },
});

const supermarketToBuyable = (
  slot: SupermarketSlot & { item: NonNullable<SupermarketSlot["item"]> }
): AmenityBuyable => ({
  tooltipModel: {
    name: slot.item.name,
    priceUsd: slot.item.priceUsd,
    sale: slot.item.sale,
  },
  itemRef: { kind: "supermarket", id: slot.item.id },
});

const carWashToBuyable = (
  slot: CarWashSlot & { car: NonNullable<CarWashSlot["car"]> }
): AmenityBuyable => ({
  tooltipModel: {
    name: `${slot.car.name} · ${slot.car.model} ${String(slot.car.year)}`,
    priceUsd: slot.car.priceUsd,
    sale: slot.car.sale,
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
}): AmenityBuyable | null => {
  if (input.kind === "shop") {
    const slot = input.findShop();
    return slot === null ? null : shopToBuyable(slot);
  }
  if (input.kind === "supermarket") {
    const slot = input.findSupermarket();
    if (slot === null || slot.item === null) return null;
    return supermarketToBuyable(
      slot as SupermarketSlot & { item: NonNullable<SupermarketSlot["item"]> }
    );
  }
  const slot = input.findCar();
  if (slot === null || slot.car === null) return null;
  return carWashToBuyable(
    slot as CarWashSlot & { car: NonNullable<CarWashSlot["car"]> }
  );
};
