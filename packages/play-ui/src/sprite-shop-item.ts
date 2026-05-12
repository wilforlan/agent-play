/**
 * @packageDocumentation
 * @module @agent-play/play-ui/sprite-shop-item
 *
 * Vector renderer for a single bookstore "card" — used in the amenity shop
 * stage. Items show as standing file cards with a coloured band by type
 * (book / music / coffee) and a glyph painted on the band.
 *
 * Each sprite supports a `sold: boolean` flag: when set, every fill is
 * pushed through {@link desaturateColor} and a {@link buildSoldBadge}
 * overlay is layered last so the card reads as inactive.
 *
 * @see ./amenity-shop-stage.ts — the stage that lays out the cards.
 * @see ./sprite-sold-overlay.ts — sold-state visual treatment.
 */

import { Container, Graphics, Text } from "pixi.js";
import { desaturateColor } from "@agent-play/sdk/browser";
import { buildSoldBadge } from "./sprite-sold-overlay.js";

/**
 * Shop item type the sprite supports.
 *
 * @public
 */
export type ShopItemSpriteType = "book" | "music" | "coffee";

const BAND_COLORS: Record<ShopItemSpriteType, number> = {
  book: 0x3b3290,
  music: 0x1e8e7a,
  coffee: 0x8a5a2b,
};

const GLYPHS: Record<ShopItemSpriteType, string> = {
  book: "BOOK",
  music: "♪",
  coffee: "☕",
};

const CARD_WIDTH = 92;
const CARD_HEIGHT = 124;
const CARD_BODY_COLOR = 0xf5efde;
const CARD_BODY_SHADOW = 0x9c8a5a;

/**
 * Return the band color associated with a {@link ShopItemSpriteType}.
 *
 * @public
 */
export const shopItemTypeColor = (type: ShopItemSpriteType): number =>
  BAND_COLORS[type];

/**
 * Options accepted by {@link buildShopItemSprite}.
 *
 * @public
 */
export type BuildShopItemSpriteOptions = {
  type: ShopItemSpriteType;
  sold: boolean;
  label: string;
};

/**
 * Build a single bookstore "card" sprite.
 *
 * @example
 * ```ts
 * const card = buildShopItemSprite({
 *   type: "book",
 *   sold: false,
 *   label: "Hitchhiker",
 * });
 * card.position.set(slotX, slotY);
 * shopStage.addChild(card);
 * ```
 *
 * @public
 */
export const buildShopItemSprite = (
  options: BuildShopItemSpriteOptions
): Container => {
  const root = new Container();
  const recolor = (hex: number): number =>
    options.sold ? desaturateColor(hex) : hex;
  const accentAlpha = options.sold ? 0.4 : 1;

  const shadow = new Graphics();
  shadow
    .rect(-CARD_WIDTH / 2 + 4, -CARD_HEIGHT / 2 + 4, CARD_WIDTH, CARD_HEIGHT)
    .fill({ color: recolor(CARD_BODY_SHADOW), alpha: 0.25 });
  root.addChild(shadow);

  const body = new Graphics();
  body
    .rect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT)
    .fill({ color: recolor(CARD_BODY_COLOR) });
  body
    .rect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT)
    .stroke({ color: recolor(CARD_BODY_SHADOW), width: 1.5 });
  root.addChild(body);

  const band = new Graphics();
  const bandHeight = CARD_HEIGHT * 0.32;
  band
    .rect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, bandHeight)
    .fill({ color: recolor(BAND_COLORS[options.type]) });
  root.addChild(band);

  const glyph = new Text({
    text: GLYPHS[options.type],
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 18,
      fontWeight: "800",
      fill: 0xffffff,
    },
  });
  glyph.anchor.set(0.5);
  glyph.position.set(0, -CARD_HEIGHT / 2 + bandHeight / 2);
  glyph.alpha = accentAlpha;
  root.addChild(glyph);

  const labelText = new Text({
    text: options.label,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 11,
      fontWeight: "700",
      fill: recolor(0x222222),
      align: "center",
      wordWrap: true,
      wordWrapWidth: CARD_WIDTH - 12,
    },
  });
  labelText.anchor.set(0.5, 0);
  labelText.position.set(0, -CARD_HEIGHT / 2 + bandHeight + 8);
  root.addChild(labelText);

  if (options.sold) {
    const badge = buildSoldBadge({ width: CARD_WIDTH, height: CARD_HEIGHT });
    badge.position.set(-CARD_WIDTH / 2, -CARD_HEIGHT / 2);
    root.addChild(badge);
  }

  return root;
};
