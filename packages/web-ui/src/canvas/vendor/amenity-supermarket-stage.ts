/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-supermarket-stage
 *
 * The "supermarket" amenity stage — a 4×5 grid of slots with row banners
 * labelled `Fruits / Mens / Womens / Kids`. Each filled cell hosts a
 * {@link buildGroceryItemSprite}; empty cells render as faint placeholders
 * so the grid stays legible.
 *
 * @see ./sprite-grocery-item.ts — per-cell sprite renderer.
 * @see ./amenity-stage-base.ts — shared helpers (bounds, proximity, door).
 */

import { Container, Graphics, Text } from "pixi.js";
import {
  buildGroceryItemSprite,
  resolveGroceryVariant,
  type SupermarketRow,
} from "./sprite-grocery-item.js";
import {
  clampToBounds,
  findNearestSlot,
  mountExitDoor,
  type AmenityStageBounds,
} from "./amenity-stage-base.js";
import type { StageHandle } from "./stage-controller.js";

/**
 * Walkable bounds for the supermarket stage.
 *
 * @public
 */
export const SUPERMARKET_BOUNDS: AmenityStageBounds = {
  minX: 0,
  minY: 0,
  maxX: 12,
  maxY: 8,
};

/**
 * Row label per supermarket row.
 *
 * @public
 */
export const SUPERMARKET_ROW_LABELS: Record<SupermarketRow, string> = {
  1: "Fruits",
  2: "Mens",
  3: "Womens",
  4: "Kids",
};

/**
 * Snapshot of a supermarket item.
 *
 * @public
 */
export type SupermarketItemSnapshot = {
  readonly id: string;
  readonly row: SupermarketRow;
  readonly column: 1 | 2 | 3 | 4 | 5;
  readonly name: string;
  readonly priceUsd: number;
  readonly sale: { status: "available" | "sold"; soldToPlayerId?: string };
};

/**
 * Layout position for a single grid cell (filled or empty).
 *
 * @public
 */
export type SupermarketSlot = {
  readonly id: string;
  readonly row: SupermarketRow;
  readonly column: 1 | 2 | 3 | 4 | 5;
  readonly x: number;
  readonly y: number;
  readonly item: SupermarketItemSnapshot | null;
};

const COLUMNS = 5;
const ROWS = 4;
const CELL_OFFSET_X = 1.5;
const CELL_OFFSET_Y = 1.5;
const CELL_SPACING_X = 1.8;
const CELL_SPACING_Y = 1.5;

/**
 * Lay out the 4×5 grid. Filled positions reference the item; empty
 * positions return `item: null`.
 *
 * @public
 */
export const layoutSupermarketSlots = (
  items: ReadonlyArray<SupermarketItemSnapshot>
): SupermarketSlot[] => {
  const byKey = new Map<string, SupermarketItemSnapshot>();
  for (const item of items) {
    byKey.set(`${item.row}:${item.column}`, item);
  }
  const slots: SupermarketSlot[] = [];
  for (let r = 1; r <= ROWS; r += 1) {
    for (let c = 1; c <= COLUMNS; c += 1) {
      const key = `${r}:${c}`;
      const item = byKey.get(key) ?? null;
      slots.push({
        id: item?.id ?? `__empty_${key}`,
        row: r as SupermarketRow,
        column: c as 1 | 2 | 3 | 4 | 5,
        x: CELL_OFFSET_X + (c - 1) * CELL_SPACING_X,
        y: CELL_OFFSET_Y + (r - 1) * CELL_SPACING_Y,
        item,
      });
    }
  }
  return slots;
};

/**
 * Player spawn inside the supermarket, away from the exit door at (0, 0).
 *
 * @public
 */
export const supermarketSpawnPosition = (): { x: number; y: number } => ({
  x: SUPERMARKET_BOUNDS.maxX / 2,
  y: SUPERMARKET_BOUNDS.maxY - 1,
});

const buildSupermarketBackdrop = (cellScale: number): Container => {
  const root = new Container();
  const width = SUPERMARKET_BOUNDS.maxX * cellScale;
  const height = SUPERMARKET_BOUNDS.maxY * cellScale;
  const floor = new Graphics();
  floor.rect(0, 0, width, height).fill({ color: 0xe6efe7 });
  for (let i = 0; i < width; i += cellScale * 0.6) {
    floor.moveTo(i, 0).lineTo(i, height).stroke({
      color: 0x99b3a0,
      width: 0.5,
      alpha: 0.4,
    });
  }
  for (let j = 0; j < height; j += cellScale * 0.6) {
    floor.moveTo(0, j).lineTo(width, j).stroke({
      color: 0x99b3a0,
      width: 0.5,
      alpha: 0.4,
    });
  }
  root.addChild(floor);

  return root;
};

const buildRowBanners = (cellScale: number): Container => {
  const root = new Container();
  for (let r = 1; r <= ROWS; r += 1) {
    const y = (CELL_OFFSET_Y + (r - 1) * CELL_SPACING_Y) * cellScale;
    const banner = new Graphics();
    banner.rect(0, y - cellScale * 0.6, cellScale * 1.4, cellScale * 0.4).fill({
      color: 0x305a8c,
    });
    root.addChild(banner);
    const label = new Text({
      text: SUPERMARKET_ROW_LABELS[r as SupermarketRow],
      style: {
        fontFamily: "system-ui, sans-serif",
        fontSize: Math.max(11, Math.round(cellScale * 0.4)),
        fontWeight: "700",
        fill: 0xffffff,
        letterSpacing: 2,
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(8, y - cellScale * 0.4);
    root.addChild(label);
  }
  return root;
};

/**
 * Handle returned by {@link buildAmenitySupermarketStage}.
 *
 * @public
 */
export type AmenitySupermarketStageHandle = StageHandle & {
  refresh(items: ReadonlyArray<SupermarketItemSnapshot>): void;
  getSlots(): ReadonlyArray<SupermarketSlot>;
  findNearbyItem(
    playerWorld: { x: number; y: number }
  ): SupermarketSlot | null;
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
};

/**
 * Build the supermarket stage.
 *
 * @public
 */
export const buildAmenitySupermarketStage = (input: {
  cellScale: number;
  items: ReadonlyArray<SupermarketItemSnapshot>;
}): AmenitySupermarketStageHandle => {
  const root = new Container();
  root.addChild(buildSupermarketBackdrop(input.cellScale));
  root.addChild(buildRowBanners(input.cellScale));

  const itemsLayer = new Container();
  root.addChild(itemsLayer);

  let slots: SupermarketSlot[] = [];

  const refresh = (next: ReadonlyArray<SupermarketItemSnapshot>): void => {
    itemsLayer.removeChildren();
    slots = layoutSupermarketSlots(next);
    for (const slot of slots) {
      if (slot.item === null) {
        const placeholder = new Graphics();
        placeholder
          .rect(-26, -26, 52, 52)
          .stroke({ color: 0x9bb1a4, width: 1, alpha: 0.55 });
        placeholder.position.set(
          slot.x * input.cellScale,
          slot.y * input.cellScale
        );
        itemsLayer.addChild(placeholder);
        continue;
      }
      const variant = resolveGroceryVariant({
        name: slot.item.name,
        row: slot.row,
      });
      const sprite = buildGroceryItemSprite({
        variant,
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
    id: "amenitySupermarket",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    refresh,
    getSlots: () => slots,
    findNearbyItem: (playerWorld) => {
      const filled = slots.filter(
        (slot): slot is SupermarketSlot & { item: SupermarketItemSnapshot } =>
          slot.item !== null
      );
      return findNearestSlot(filled, playerWorld);
    },
    clampPosition: (pos) => clampToBounds(pos, SUPERMARKET_BOUNDS),
    exitDoorAnchor,
  };
};
