/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-shop-stage
 *
 * The "shop" amenity stage — a bookstore lined with wooden shelves and
 * standing "file" cards for each item. The host fans out the latest
 * `shopItems` from the preview snapshot; this module turns each item
 * into a {@link buildShopItemSprite} card, lays them on a row, and lets
 * the host scan proximity via {@link findNearestSlot}.
 *
 * @see ./sprite-shop-item.ts — card renderer.
 * @see ./amenity-stage-base.ts — shared bounds / proximity helpers.
 */

import { Container, Graphics, Text } from "pixi.js";
import {
  buildShopItemSprite,
  type ShopItemSpriteType,
} from "./sprite-shop-item.js";
import {
  clampToBounds,
  findNearestSlot,
  mountExitDoor,
  type AmenityStageBounds,
} from "./amenity-stage-base.js";
import type { StageHandle } from "./stage-controller.js";

/**
 * Walkable bounds for the shop stage.
 *
 * @public
 */
export const SHOP_BOUNDS: AmenityStageBounds = {
  minX: 0,
  minY: 0,
  maxX: 10,
  maxY: 6,
};

/**
 * Snapshot of a shop item as it arrives from the server snapshot.
 *
 * @public
 */
export type ShopItemSnapshot = {
  readonly id: string;
  readonly type: ShopItemSpriteType;
  readonly name: string;
  readonly priceUsd: number;
  readonly sale: { status: "available" | "sold"; soldToPlayerId?: string };
};

/**
 * Position of a single shop card in stage-local coordinates.
 *
 * @public
 */
export type ShopItemSlot = {
  readonly id: string;
  readonly item: ShopItemSnapshot;
  readonly x: number;
  readonly y: number;
};

const SHELF_ROW_Y = SHOP_BOUNDS.maxY * 0.5;
const SLOT_SPACING_CELLS = 1.6;

/**
 * Lay out a row of shop items along the back wall.
 *
 * @public
 */
export const layoutShopSlots = (
  items: ReadonlyArray<ShopItemSnapshot>
): ShopItemSlot[] => {
  if (items.length === 0) return [];
  const totalWidth = (items.length - 1) * SLOT_SPACING_CELLS;
  const startX =
    (SHOP_BOUNDS.maxX - SHOP_BOUNDS.minX) / 2 + SHOP_BOUNDS.minX - totalWidth / 2;
  return items.map((item, index) => ({
    id: item.id,
    item,
    x: startX + index * SLOT_SPACING_CELLS,
    y: SHELF_ROW_Y,
  }));
};

/**
 * Spawn point inside the shop, away from the exit door at `(0, 0)`.
 *
 * @public
 */
export const shopSpawnPosition = (): { x: number; y: number } => ({
  x: SHOP_BOUNDS.maxX / 2,
  y: SHOP_BOUNDS.maxY - 1,
});

const buildShopBackdrop = (cellScale: number): Container => {
  const root = new Container();
  const width = SHOP_BOUNDS.maxX * cellScale;
  const height = SHOP_BOUNDS.maxY * cellScale;

  const floor = new Graphics();
  floor.rect(0, 0, width, height).fill({ color: 0xc59873 });
  for (let i = 0; i < width; i += cellScale * 0.5) {
    floor.moveTo(i, 0).lineTo(i, height).stroke({
      color: 0x8c623f,
      width: 0.6,
      alpha: 0.5,
    });
  }
  root.addChild(floor);

  const wall = new Graphics();
  wall.rect(0, 0, width, cellScale * 1.4).fill({ color: 0xe9d8b4 });
  root.addChild(wall);

  const bookshelf = new Graphics();
  bookshelf.rect(0, cellScale * 0.4, width, cellScale * 1).fill({
    color: 0x6b3f1f,
  });
  for (let i = 0; i < width; i += 12) {
    const stripeColor = (i * 7919) % 4 === 0 ? 0xb24a3f : 0x2f6c63;
    bookshelf
      .rect(i, cellScale * 0.5, 10, cellScale * 0.8)
      .fill({ color: stripeColor, alpha: 0.85 });
  }
  root.addChild(bookshelf);

  return root;
};

const buildShopBanner = (cellScale: number): Text => {
  const banner = new Text({
    text: "BOOKSTORE",
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(14, Math.round(cellScale * 0.5)),
      fontWeight: "800",
      fill: 0x222222,
      letterSpacing: 4,
    },
  });
  banner.anchor.set(0.5, 0);
  banner.position.set(
    (SHOP_BOUNDS.maxX * cellScale) / 2,
    cellScale * 0.15
  );
  return banner;
};

/**
 * Handle returned by {@link buildAmenityShopStage} — extends a
 * {@link StageHandle} with proximity queries and a re-render API.
 *
 * @public
 */
export type AmenityShopStageHandle = StageHandle & {
  refresh(items: ReadonlyArray<ShopItemSnapshot>): void;
  getSlots(): ReadonlyArray<ShopItemSlot>;
  findNearbyItem(playerWorld: { x: number; y: number }): ShopItemSlot | null;
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
};

/**
 * Build the shop stage.
 *
 * @public
 */
export const buildAmenityShopStage = (input: {
  cellScale: number;
  items: ReadonlyArray<ShopItemSnapshot>;
}): AmenityShopStageHandle => {
  const root = new Container();
  root.addChild(buildShopBackdrop(input.cellScale));
  root.addChild(buildShopBanner(input.cellScale));

  const itemsLayer = new Container();
  root.addChild(itemsLayer);

  let slots: ShopItemSlot[] = [];

  const refresh = (next: ReadonlyArray<ShopItemSnapshot>): void => {
    itemsLayer.removeChildren();
    slots = layoutShopSlots(next);
    for (const slot of slots) {
      const sprite = buildShopItemSprite({
        type: slot.item.type,
        sold: slot.item.sale.status === "sold",
        label: slot.item.name,
      });
      sprite.position.set(
        slot.x * input.cellScale,
        slot.y * input.cellScale
      );
      itemsLayer.addChild(sprite);
    }
  };

  refresh(input.items);
  const exitDoorAnchor = mountExitDoor({ root, cellScale: input.cellScale });

  return {
    id: "amenityShop",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    refresh,
    getSlots: () => slots,
    findNearbyItem: (playerWorld) => findNearestSlot(slots, playerWorld),
    clampPosition: (pos) => clampToBounds(pos, SHOP_BOUNDS),
    exitDoorAnchor,
  };
};
