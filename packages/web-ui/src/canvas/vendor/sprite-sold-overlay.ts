/**
 * @packageDocumentation
 * @module @agent-play/play-ui/sprite-sold-overlay
 *
 * Shared visual treatment applied to amenity sprites when their backing
 * record has `sale.status === 'sold'`.
 *
 * Two pieces of art are coordinated here:
 * - {@link desaturateColor} (re-exported from
 *   `@agent-play/sdk`): collapses any colour to its perceptual grey.
 * - {@link buildSoldBadge}: a centred red diagonal banner with bold white
 *   `SOLD` text and a soft drop shadow, ready to drop on top of the
 *   desaturated artwork.
 *
 * @see ../../sdk/src/lib/space-content-model.ts for `desaturateColor` and
 *      the `SaleState` schema this overlay reflects.
 * @see ./sprite-shop-item.ts, ./sprite-grocery-item.ts, ./sprite-car.ts —
 *      the three sprite renderers that compose this overlay.
 */

import { Container, Graphics, Text } from "pixi.js";
import { desaturateColor } from "@agent-play/sdk/browser";

export { desaturateColor };

/**
 * Constant red used for the diagonal banner. Exported so sprite-specific
 * recolour passes can match.
 *
 * @public
 */
export const soldBadgeBannerColor = 0xcc1f1f;

const SOLD_BADGE_SHADOW_COLOR = 0x000000;
const SOLD_BADGE_TEXT_COLOR = 0xffffff;
const SOLD_BADGE_HEIGHT_RATIO = 0.28;
const SOLD_BADGE_FONT_RATIO = 0.16;

/**
 * Options accepted by {@link buildSoldBadge}.
 *
 * @public
 */
export type BuildSoldBadgeOptions = {
  /** Pixel width of the host sprite's bounding box. */
  width: number;
  /** Pixel height of the host sprite's bounding box. */
  height: number;
  /** Optional label override; defaults to `"SOLD"`. */
  label?: string;
};

/**
 * Build the `SOLD` overlay container.
 *
 * @remarks
 * The returned container is anchored at the centre of the requested
 * bounding box. Callers add it last to their sprite so it sits above any
 * desaturated artwork.
 *
 * @example
 * ```ts
 * const sprite = new Container();
 * sprite.addChild(buildCarBody({ colorHex: 0xcc0000, sold: true }));
 * sprite.addChild(buildSoldBadge({ width: 160, height: 90 }));
 * ```
 *
 * @public
 */
export const buildSoldBadge = (options: BuildSoldBadgeOptions): Container => {
  const { width, height, label = "SOLD" } = options;
  const container = new Container();
  container.x = width / 2;
  container.y = height / 2;

  const diagonal = Math.hypot(width, height);
  const bannerWidth = diagonal * 0.95;
  const bannerHeight = Math.max(14, height * SOLD_BADGE_HEIGHT_RATIO);

  const shadow = new Graphics();
  shadow.rect(
    -bannerWidth / 2 + 2,
    -bannerHeight / 2 + 2,
    bannerWidth,
    bannerHeight
  );
  shadow.fill({ color: SOLD_BADGE_SHADOW_COLOR, alpha: 0.28 });
  shadow.rotation = Math.atan2(height, width);
  container.addChild(shadow);

  const banner = new Graphics();
  banner.rect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight);
  banner.fill({ color: soldBadgeBannerColor });
  banner.rotation = Math.atan2(height, width);
  container.addChild(banner);

  const fontSize = Math.max(12, Math.round(diagonal * SOLD_BADGE_FONT_RATIO));
  const text = new Text({
    text: label,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize,
      fontWeight: "900",
      fill: SOLD_BADGE_TEXT_COLOR,
      stroke: { color: SOLD_BADGE_SHADOW_COLOR, width: 2, alpha: 0.4 },
      letterSpacing: 2,
    },
  });
  text.anchor.set(0.5);
  text.rotation = Math.atan2(height, width);
  container.addChild(text);

  return container;
};
