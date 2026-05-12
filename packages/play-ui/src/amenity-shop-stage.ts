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

const WALL_HEIGHT_CELLS = 2.5;
const BOOKCASE_TOP_CELLS = 0.7;
const BOOKCASE_BOTTOM_CELLS = 2.45;
const SHELF_COUNT = 3;

const BOOK_SPINE_PALETTE: ReadonlyArray<number> = [
  0x6b2c2c, 0x2c3a5e, 0x3e6b4f, 0xb88b2e, 0x5b3a78, 0x2f6e7a,
  0x7a3d2a, 0x4a4a4a, 0xa3441a, 0xc89b6a, 0x8a3158, 0x274d3a,
  0x8c704f, 0x395f7d, 0x9c5224,
];

const BOOK_ACCENT_PALETTE: ReadonlyArray<number> = [
  0xd4af37, 0xefe7d2, 0xe8b97a, 0xc0c0c0,
];

const seededRandom = (seed: number): number => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pickFrom = <T>(arr: ReadonlyArray<T>, seed: number, fallback: T): T => {
  if (arr.length === 0) return fallback;
  const idx = Math.floor(seededRandom(seed) * arr.length);
  return arr[idx] ?? fallback;
};

type BookVariant = "plain" | "band" | "titled" | "ornate";

const drawBookSpine = (input: {
  g: Graphics;
  x: number;
  y: number;
  width: number;
  height: number;
  spineColor: number;
  accentColor: number;
  variant: BookVariant;
}): void => {
  const { g, x, y, width, height, spineColor, accentColor, variant } = input;
  g.rect(x, y, width, height).fill({ color: spineColor });
  const edgeW = Math.max(1, width * 0.18);
  g.rect(x, y, edgeW, height).fill({ color: 0xffffff, alpha: 0.1 });
  g.rect(x + width - edgeW * 0.7, y, edgeW * 0.7, height)
    .fill({ color: 0x000000, alpha: 0.25 });
  const capH = Math.max(1, height * 0.05);
  g.rect(x + edgeW * 0.4, y, Math.max(1, width - edgeW), capH)
    .fill({ color: 0xefe7d2, alpha: 0.65 });
  if (variant === "band" || variant === "titled" || variant === "ornate") {
    const bandH = Math.max(2, height * 0.09);
    const bandY = y + height * 0.42;
    g.rect(x, bandY, width, bandH).fill({ color: accentColor });
    if (variant === "titled" || variant === "ornate") {
      g.rect(x + width * 0.2, bandY + bandH * 0.3, width * 0.6, bandH * 0.4)
        .fill({ color: 0x000000, alpha: 0.35 });
    }
  }
  if (variant === "ornate") {
    const lineH = Math.max(1, height * 0.025);
    g.rect(x + width * 0.25, y + height * 0.15, width * 0.5, lineH)
      .fill({ color: accentColor, alpha: 0.85 });
    g.rect(x + width * 0.3, y + height * 0.22, width * 0.4, lineH * 0.8)
      .fill({ color: accentColor, alpha: 0.7 });
  }
};

const drawBookStackHorizontal = (input: {
  g: Graphics;
  x: number;
  floorY: number;
  maxWidth: number;
  bookHeight: number;
  seed: number;
}): number => {
  const { g, x, floorY, maxWidth, bookHeight, seed } = input;
  const count = 3 + Math.floor(seededRandom(seed) * 3);
  const baseW = Math.min(maxWidth, bookHeight * 5.5);
  for (let i = 0; i < count; i += 1) {
    const w = baseW * (0.82 + seededRandom(seed + i * 7) * 0.18);
    const h = bookHeight * (0.85 + seededRandom(seed + i * 13) * 0.18);
    const offsetX = x + (baseW - w) / 2;
    const yy = floorY - h * (i + 1);
    const color = pickFrom(BOOK_SPINE_PALETTE, seed + i * 19, 0x6b2c2c);
    g.rect(offsetX, yy, w, h).fill({ color });
    g.rect(offsetX + w * 0.05, yy + h * 0.15, w * 0.9, Math.max(1, h * 0.12))
      .fill({ color: 0xefe7d2, alpha: 0.55 });
    g.rect(offsetX, yy + h - 1, w, 1).fill({ color: 0x000000, alpha: 0.22 });
  }
  return baseW + 6;
};

const drawVinylDecoration = (input: {
  g: Graphics;
  x: number;
  floorY: number;
  compartmentH: number;
  seed: number;
}): number => {
  const { g, x, floorY, compartmentH, seed } = input;
  const size = compartmentH * 0.82;
  const cx = x + size / 2;
  const cy = floorY - size / 2;
  g.rect(x, floorY - size * 1.02, size, size * 1.02)
    .fill({ color: 0x1a1a1a, alpha: 0.95 });
  g.circle(cx, cy, size / 2 - 1).fill({ color: 0x0e0e0e });
  g.circle(cx, cy, size / 2 - 1).stroke({
    color: 0xffffff,
    alpha: 0.08,
    width: 1,
  });
  const labelPalette: ReadonlyArray<number> = [
    0xb24a3f, 0xb88b2e, 0x2c3a5e, 0x3e6b4f, 0x8a3158,
  ];
  const labelColor = pickFrom(labelPalette, seed, 0xb24a3f);
  g.circle(cx, cy, size / 4).fill({ color: labelColor });
  g.circle(cx, cy, Math.max(1, size * 0.04)).fill({ color: 0x111111 });
  return size + 4;
};

const drawJarDecoration = (input: {
  g: Graphics;
  x: number;
  floorY: number;
  compartmentH: number;
  seed: number;
}): number => {
  const { g, x, floorY, compartmentH, seed } = input;
  const w = compartmentH * 0.55;
  const h = compartmentH * 0.78;
  const yy = floorY - h;
  const bodyPalette: ReadonlyArray<number> = [
    0xc89b6a, 0x9c5224, 0x6b3f1f, 0x395f7d, 0x3e6b4f,
  ];
  const bodyColor = pickFrom(bodyPalette, seed, 0xc89b6a);
  g.rect(x, yy + h * 0.12, w, h * 0.88).fill({ color: bodyColor });
  g.rect(x + w * 0.06, yy + h * 0.18, w * 0.18, h * 0.7)
    .fill({ color: 0xffffff, alpha: 0.15 });
  g.rect(x - w * 0.06, yy, w * 1.12, h * 0.16)
    .fill({ color: 0x3c2410 });
  g.rect(x + w * 0.12, yy + h * 0.46, w * 0.76, h * 0.26)
    .fill({ color: 0xefe7d2, alpha: 0.95 });
  g.rect(x + w * 0.18, yy + h * 0.52, w * 0.64, Math.max(1, h * 0.05))
    .fill({ color: 0x000000, alpha: 0.4 });
  return w + 6;
};

type ShelfDecoration =
  | { kind: "stack"; position: number }
  | { kind: "vinyl"; position: number }
  | { kind: "jar"; position: number };

const populateShelf = (input: {
  g: Graphics;
  startX: number;
  floorY: number;
  width: number;
  compartmentH: number;
  cellScale: number;
  seed: number;
  decorations: ReadonlyArray<ShelfDecoration>;
}): void => {
  const { g, startX, floorY, width, compartmentH, cellScale, seed } = input;
  let cursor = startX;
  const endX = startX + width;
  let index = 0;
  const remaining = input.decorations.slice();
  const minBookW = Math.max(4, cellScale * 0.12);
  const maxBookW = Math.max(minBookW + 4, cellScale * 0.26);

  while (cursor < endX - 4) {
    const progress = (cursor - startX) / Math.max(1, width);
    const nextDeco = remaining[0];
    if (nextDeco && progress >= nextDeco.position) {
      let consumed = 0;
      if (nextDeco.kind === "stack") {
        consumed = drawBookStackHorizontal({
          g,
          x: cursor,
          floorY,
          maxWidth: Math.min(compartmentH * 1.6, endX - cursor),
          bookHeight: compartmentH * 0.18,
          seed: seed + index * 41,
        });
      } else if (nextDeco.kind === "vinyl") {
        consumed = drawVinylDecoration({
          g,
          x: cursor,
          floorY,
          compartmentH,
          seed: seed + index * 43,
        });
      } else {
        consumed = drawJarDecoration({
          g,
          x: cursor,
          floorY,
          compartmentH,
          seed: seed + index * 47,
        });
      }
      cursor += consumed;
      remaining.shift();
      index += 1;
      continue;
    }

    const bookW =
      minBookW + seededRandom(seed + index * 11) * (maxBookW - minBookW);
    if (cursor + bookW > endX - 2) break;

    const heightRatio = 0.78 + seededRandom(seed + index * 13) * 0.2;
    const bookH = compartmentH * heightRatio;
    const yy = floorY - bookH;

    const spineColor = pickFrom(
      BOOK_SPINE_PALETTE,
      seed + index * 17,
      0x6b2c2c
    );
    const accentColor = pickFrom(
      BOOK_ACCENT_PALETTE,
      seed + index * 19,
      0xd4af37
    );
    const variantRoll = seededRandom(seed + index * 23);
    const variant: BookVariant =
      variantRoll < 0.35
        ? "plain"
        : variantRoll < 0.65
          ? "band"
          : variantRoll < 0.88
            ? "titled"
            : "ornate";

    drawBookSpine({
      g,
      x: cursor,
      y: yy,
      width: bookW,
      height: bookH,
      spineColor,
      accentColor,
      variant,
    });

    const gap = seededRandom(seed + index * 29) > 0.85 ? 2 : 0;
    cursor += bookW + gap;
    index += 1;
  }
};

const buildShopBackdrop = (cellScale: number): Container => {
  const root = new Container();
  const width = SHOP_BOUNDS.maxX * cellScale;
  const height = SHOP_BOUNDS.maxY * cellScale;

  const floor = new Graphics();
  floor.rect(0, 0, width, height).fill({ color: 0xc59873 });
  const plankSeam = cellScale * 0.65;
  for (let yy = plankSeam; yy < height; yy += plankSeam) {
    floor.moveTo(0, yy).lineTo(width, yy).stroke({
      color: 0x8c623f,
      width: 0.8,
      alpha: 0.55,
    });
  }
  for (let xx = plankSeam * 0.9; xx < width; xx += plankSeam * 2.4) {
    floor.moveTo(xx, 0).lineTo(xx, height).stroke({
      color: 0x8c623f,
      width: 0.4,
      alpha: 0.22,
    });
  }
  root.addChild(floor);

  const wallBottom = cellScale * WALL_HEIGHT_CELLS;
  const wall = new Graphics();
  wall.rect(0, 0, width, wallBottom).fill({ color: 0xe9d8b4 });
  wall
    .rect(0, wallBottom - 2, width, 2)
    .fill({ color: 0x000000, alpha: 0.2 });
  root.addChild(wall);

  const shelf = new Graphics();
  const frameX = cellScale * 0.35;
  const frameW = width - cellScale * 0.7;
  const frameY = cellScale * BOOKCASE_TOP_CELLS;
  const frameH = cellScale * (BOOKCASE_BOTTOM_CELLS - BOOKCASE_TOP_CELLS);

  shelf
    .rect(frameX + 4, frameY + 4, frameW, frameH)
    .fill({ color: 0x000000, alpha: 0.25 });
  shelf.rect(frameX, frameY, frameW, frameH).fill({ color: 0xb38256 });
  for (let xx = frameX + 8; xx < frameX + frameW; xx += 22) {
    shelf
      .moveTo(xx, frameY + 4)
      .lineTo(xx, frameY + frameH - 4)
      .stroke({ color: 0x7a4d24, width: 0.5, alpha: 0.25 });
  }

  const crownH = cellScale * 0.22;
  shelf
    .rect(
      frameX - cellScale * 0.15,
      frameY - crownH,
      frameW + cellScale * 0.3,
      crownH
    )
    .fill({ color: 0x4a2d12 });
  shelf
    .rect(
      frameX - cellScale * 0.15,
      frameY - crownH,
      frameW + cellScale * 0.3,
      Math.max(2, crownH * 0.18)
    )
    .fill({ color: 0x6b3f1f });

  const postW = cellScale * 0.2;
  shelf.rect(frameX, frameY, postW, frameH).fill({ color: 0x5a3819 });
  shelf
    .rect(frameX + frameW - postW, frameY, postW, frameH)
    .fill({ color: 0x5a3819 });
  shelf
    .rect(frameX + 1, frameY, 2, frameH)
    .fill({ color: 0x7a4d24, alpha: 0.7 });
  shelf
    .rect(frameX + frameW - postW + 1, frameY, 2, frameH)
    .fill({ color: 0x7a4d24, alpha: 0.7 });

  shelf
    .rect(
      frameX - cellScale * 0.1,
      frameY + frameH,
      frameW + cellScale * 0.2,
      cellScale * 0.18
    )
    .fill({ color: 0x4a2d12 });

  const innerX = frameX + postW;
  const innerW = frameW - postW * 2;
  const compartmentH = frameH / SHELF_COUNT;
  const plankT = Math.max(3, cellScale * 0.09);

  shelf
    .rect(innerX, frameY, innerW, Math.max(2, plankT * 0.7))
    .fill({ color: 0x4a2d12 });

  const decorationsByShelf: ReadonlyArray<ReadonlyArray<ShelfDecoration>> = [
    [{ kind: "stack", position: 0.04 }],
    [{ kind: "vinyl", position: 0.58 }],
    [{ kind: "jar", position: 0.78 }],
  ];

  for (let i = 0; i < SHELF_COUNT; i += 1) {
    const compTop = frameY + i * compartmentH;
    const compBottom = compTop + compartmentH;
    const floorY = compBottom - plankT * 0.5;
    populateShelf({
      g: shelf,
      startX: innerX + 2,
      floorY,
      width: innerW - 4,
      compartmentH: compartmentH - plankT,
      cellScale,
      seed: 400 + i * 113,
      decorations: decorationsByShelf[i] ?? [],
    });
    shelf
      .rect(innerX, compBottom - plankT, innerW, plankT)
      .fill({ color: 0x5a3819 });
    shelf
      .rect(innerX, compBottom - plankT, innerW, Math.max(1, plankT * 0.22))
      .fill({ color: 0x8a5a2b });
    shelf
      .rect(innerX, compBottom, innerW, 1.5)
      .fill({ color: 0x000000, alpha: 0.3 });
  }

  root.addChild(shelf);

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
