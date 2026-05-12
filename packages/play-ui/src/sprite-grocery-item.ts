/**
 * @packageDocumentation
 * @module @agent-play/play-ui/sprite-grocery-item
 *
 * Vector renderer for supermarket grid items.
 *
 * Each supermarket row carries a theme — fruits, men's, women's, kids' —
 * and the sprite picks the right variant from the row + the item name
 * (e.g. row 1 "Apple" → apple, row 2 "Sunglasses" → sunglasses). When the
 * item name doesn't match any keyword, the row's default variant is used
 * so an entry always renders.
 *
 * @see ./amenity-supermarket-stage.ts — the host stage.
 * @see ./sprite-sold-overlay.ts — sold-state overlay shared with the other
 *      amenity sprites.
 */

import { Container, Graphics, Text } from "pixi.js";
import { desaturateColor } from "@agent-play/sdk/browser";
import { buildSoldBadge } from "./sprite-sold-overlay.js";

/**
 * Supermarket row index (1 = Fruits, 2 = Mens, 3 = Womens, 4 = Kids).
 *
 * @public
 */
export type SupermarketRow = 1 | 2 | 3 | 4;

/**
 * Discrete grocery sprite variant the renderer knows how to draw.
 *
 * @public
 */
export type GrocerySpriteVariant =
  | "apple"
  | "banana"
  | "strawberry"
  | "cucumber"
  | "tomato"
  | "mango"
  | "tshirt-mens"
  | "tshirt-womens"
  | "tshirt-kids"
  | "shoes-mens"
  | "shoes-womens"
  | "shoes-kids"
  | "hat-mens"
  | "hat-womens"
  | "hat-kids"
  | "sunglasses";

const FRUIT_KEYWORDS: ReadonlyArray<{
  match: string;
  variant: GrocerySpriteVariant;
}> = [
  { match: "apple", variant: "apple" },
  { match: "banana", variant: "banana" },
  { match: "strawberry", variant: "strawberry" },
  { match: "cucumber", variant: "cucumber" },
  { match: "tomato", variant: "tomato" },
  { match: "mango", variant: "mango" },
];

const APPAREL_BASE_KEYWORDS: ReadonlyArray<{
  match: string;
  variant: "tshirt" | "shoes" | "hat" | "sunglasses";
}> = [
  { match: "tshirt", variant: "tshirt" },
  { match: "t-shirt", variant: "tshirt" },
  { match: "shirt", variant: "tshirt" },
  { match: "shoe", variant: "shoes" },
  { match: "sneaker", variant: "shoes" },
  { match: "hat", variant: "hat" },
  { match: "cap", variant: "hat" },
  { match: "sunglass", variant: "sunglasses" },
];

const APPAREL_ROW_SUFFIX: Record<2 | 3 | 4, "mens" | "womens" | "kids"> = {
  2: "mens",
  3: "womens",
  4: "kids",
};

const ROW_DEFAULTS: Record<SupermarketRow, GrocerySpriteVariant> = {
  1: "apple",
  2: "tshirt-mens",
  3: "tshirt-womens",
  4: "tshirt-kids",
};

/**
 * Pick the {@link GrocerySpriteVariant} for a supermarket entry.
 *
 * @public
 */
export const resolveGroceryVariant = (input: {
  name: string;
  row: SupermarketRow;
}): GrocerySpriteVariant => {
  const lowered = input.name.toLowerCase();
  if (input.row === 1) {
    for (const candidate of FRUIT_KEYWORDS) {
      if (lowered.includes(candidate.match)) return candidate.variant;
    }
    return ROW_DEFAULTS[1];
  }
  const suffix = APPAREL_ROW_SUFFIX[input.row];
  for (const candidate of APPAREL_BASE_KEYWORDS) {
    if (lowered.includes(candidate.match)) {
      if (candidate.variant === "sunglasses") return "sunglasses";
      return `${candidate.variant}-${suffix}` as GrocerySpriteVariant;
    }
  }
  return ROW_DEFAULTS[input.row];
};

const ITEM_WIDTH = 64;
const ITEM_HEIGHT = 64;

type Recolor = (hex: number) => number;

const drawApple = (g: Graphics, recolor: Recolor): void => {
  g.circle(0, 4, 18).fill({ color: recolor(0xd62c2c) });
  g.circle(-5, -2, 5).fill({ color: 0xffffff, alpha: 0.5 });
  g.rect(-1, -14, 2, 6).fill({ color: recolor(0x4d2a17) });
  g.ellipse(4, -14, 5, 3).fill({ color: recolor(0x2f7d23) });
};

const drawBanana = (g: Graphics, recolor: Recolor): void => {
  g.moveTo(-18, 10)
    .quadraticCurveTo(-4, -22, 18, -8)
    .quadraticCurveTo(8, 4, -16, 14)
    .closePath()
    .fill({ color: recolor(0xf4c430) });
  g.rect(17, -10, 4, 3).fill({ color: recolor(0x4d2a17) });
};

const drawStrawberry = (g: Graphics, recolor: Recolor): void => {
  g.moveTo(-14, -4)
    .quadraticCurveTo(0, 24, 14, -4)
    .quadraticCurveTo(0, -10, -14, -4)
    .closePath()
    .fill({ color: recolor(0xe23a3a) });
  g.poly([-10, -6, -2, -16, 6, -16, 12, -6])
    .fill({ color: recolor(0x2f7d23) });
};

const drawCucumber = (g: Graphics, recolor: Recolor): void => {
  g.ellipse(0, 0, 22, 8).fill({ color: recolor(0x2d8a2a) });
  for (let i = -14; i <= 14; i += 7) {
    g.circle(i, 0, 1).fill({ color: recolor(0x14541b) });
  }
};

const drawTomato = (g: Graphics, recolor: Recolor): void => {
  g.circle(0, 2, 16).fill({ color: recolor(0xd62c2c) });
  g.poly([-8, -10, -2, -16, 4, -16, 10, -10, 4, -8, -4, -8])
    .fill({ color: recolor(0x2f7d23) });
};

const drawMango = (g: Graphics, recolor: Recolor): void => {
  g.ellipse(0, 2, 16, 12).fill({ color: recolor(0xf2a02d) });
  g.ellipse(-4, -2, 5, 3).fill({ color: 0xffffff, alpha: 0.4 });
};

const drawTshirt = (
  g: Graphics,
  recolor: Recolor,
  color: number
): void => {
  g.poly([-20, -10, -10, -16, 10, -16, 20, -10, 14, -6, 14, 14, -14, 14, -14, -6])
    .fill({ color: recolor(color) });
};

const drawShoes = (g: Graphics, recolor: Recolor, color: number): void => {
  g.poly([-20, 6, -14, -6, 14, -6, 18, 4, 18, 12, -20, 12]).fill({
    color: recolor(color),
  });
  g.rect(-20, 8, 38, 4).fill({ color: 0xffffff, alpha: 0.4 });
};

const drawHat = (g: Graphics, recolor: Recolor, color: number): void => {
  g.rect(-18, 4, 36, 6).fill({ color: recolor(color) });
  g.ellipse(0, 4, 14, 8).fill({ color: recolor(color) });
  g.rect(-14, 4, 28, 2).fill({ color: 0xffffff, alpha: 0.5 });
};

const drawSunglasses = (g: Graphics, recolor: Recolor): void => {
  g.rect(-22, -4, 44, 2).fill({ color: recolor(0x222222) });
  g.ellipse(-10, 2, 8, 6).fill({ color: recolor(0x222222) });
  g.ellipse(10, 2, 8, 6).fill({ color: recolor(0x222222) });
};

const APPAREL_COLOR: Record<
  "mens" | "womens" | "kids",
  { tshirt: number; shoes: number; hat: number }
> = {
  mens: { tshirt: 0x1f4e79, shoes: 0x222222, hat: 0x2a7d3a },
  womens: { tshirt: 0xb84290, shoes: 0xa33e6e, hat: 0xe2b54f },
  kids: { tshirt: 0xf3a82c, shoes: 0x3e8bd6, hat: 0xe44d61 },
};

const drawVariant = (
  g: Graphics,
  variant: GrocerySpriteVariant,
  recolor: Recolor
): void => {
  if (variant === "apple") drawApple(g, recolor);
  else if (variant === "banana") drawBanana(g, recolor);
  else if (variant === "strawberry") drawStrawberry(g, recolor);
  else if (variant === "cucumber") drawCucumber(g, recolor);
  else if (variant === "tomato") drawTomato(g, recolor);
  else if (variant === "mango") drawMango(g, recolor);
  else if (variant === "tshirt-mens")
    drawTshirt(g, recolor, APPAREL_COLOR.mens.tshirt);
  else if (variant === "tshirt-womens")
    drawTshirt(g, recolor, APPAREL_COLOR.womens.tshirt);
  else if (variant === "tshirt-kids")
    drawTshirt(g, recolor, APPAREL_COLOR.kids.tshirt);
  else if (variant === "shoes-mens")
    drawShoes(g, recolor, APPAREL_COLOR.mens.shoes);
  else if (variant === "shoes-womens")
    drawShoes(g, recolor, APPAREL_COLOR.womens.shoes);
  else if (variant === "shoes-kids")
    drawShoes(g, recolor, APPAREL_COLOR.kids.shoes);
  else if (variant === "hat-mens")
    drawHat(g, recolor, APPAREL_COLOR.mens.hat);
  else if (variant === "hat-womens")
    drawHat(g, recolor, APPAREL_COLOR.womens.hat);
  else if (variant === "hat-kids")
    drawHat(g, recolor, APPAREL_COLOR.kids.hat);
  else if (variant === "sunglasses") drawSunglasses(g, recolor);
};

/**
 * Options accepted by {@link buildGroceryItemSprite}.
 *
 * @public
 */
export type BuildGroceryItemSpriteOptions = {
  variant: GrocerySpriteVariant;
  sold: boolean;
  label: string;
};

/**
 * Build a grocery sprite for the supermarket grid.
 *
 * @public
 */
export const buildGroceryItemSprite = (
  options: BuildGroceryItemSpriteOptions
): Container => {
  const root = new Container();
  const recolor: Recolor = options.sold
    ? (hex) => desaturateColor(hex)
    : (hex) => hex;

  const tile = new Graphics();
  tile
    .rect(-ITEM_WIDTH / 2, -ITEM_HEIGHT / 2, ITEM_WIDTH, ITEM_HEIGHT)
    .fill({ color: recolor(0xfffdf3) });
  tile
    .rect(-ITEM_WIDTH / 2, -ITEM_HEIGHT / 2, ITEM_WIDTH, ITEM_HEIGHT)
    .stroke({ color: recolor(0xc7b58a), width: 1.4 });
  root.addChild(tile);

  const artwork = new Graphics();
  drawVariant(artwork, options.variant, recolor);
  artwork.alpha = options.sold ? 0.7 : 1;
  root.addChild(artwork);

  const label = new Text({
    text: options.label,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 9,
      fontWeight: "700",
      fill: recolor(0x222222),
      align: "center",
      wordWrap: true,
      wordWrapWidth: ITEM_WIDTH - 6,
    },
  });
  label.anchor.set(0.5, 1);
  label.position.set(0, ITEM_HEIGHT / 2 - 4);
  root.addChild(label);

  if (options.sold) {
    const badge = buildSoldBadge({
      width: ITEM_WIDTH,
      height: ITEM_HEIGHT,
    });
    badge.position.set(-ITEM_WIDTH / 2, -ITEM_HEIGHT / 2);
    root.addChild(badge);
  }

  return root;
};
