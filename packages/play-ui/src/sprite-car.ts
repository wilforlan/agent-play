/**
 * @packageDocumentation
 * @module @agent-play/play-ui/sprite-car
 *
 * Vector renderer for a single car parked in the car-wash lot.
 *
 * The sprite is a stylised 3/4 isometric profile parameterised by
 * `colorHex` and an optional `model` label. Two visible wheels, a
 * tinted windshield reflection, headlights, and a plate plate slot
 * make the silhouette legible at the lot's display scale.
 *
 * When `sold === true`, every fill is pushed through
 * {@link desaturateColor} and the {@link buildSoldBadge} overlay is
 * mounted on top of the body, mirroring the shop / supermarket sprites.
 *
 * @see ./amenity-carwash-stage.ts — the host stage.
 * @see ./sprite-sold-overlay.ts — sold-state overlay.
 */

import { Container, Graphics, Text } from "pixi.js";
import { desaturateColor } from "@agent-play/sdk/browser";
import { buildSoldBadge } from "./sprite-sold-overlay.js";

const FALLBACK_COLOR = 0xcc0000;
const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

/**
 * Parse a 6-digit hex color string (`#rrggbb` or `rrggbb`) to a `0xRRGGBB`
 * integer suitable for Pixi's `fill({ color })`.
 *
 * @public
 */
export const parseHexColor = (input: string): number => {
  if (typeof input !== "string" || !HEX_PATTERN.test(input)) {
    return FALLBACK_COLOR;
  }
  const stripped = input.startsWith("#") ? input.slice(1) : input;
  const parsed = Number.parseInt(stripped, 16);
  if (Number.isNaN(parsed)) return FALLBACK_COLOR;
  return parsed;
};

const CAR_WIDTH = 180;
const CAR_HEIGHT = 92;

/**
 * Options accepted by {@link buildCarSprite}.
 *
 * @public
 */
export type BuildCarSpriteOptions = {
  colorHex: string;
  model: string;
  sold: boolean;
  scale?: number;
};

/**
 * Build the parked-car sprite for a car-wash slot.
 *
 * @example
 * ```ts
 * const car = buildCarSprite({
 *   colorHex: "#5a87d1",
 *   model: "GT 350",
 *   sold: false,
 * });
 * car.position.set(slotX, slotY);
 * lot.addChild(car);
 * ```
 *
 * @public
 */
export const buildCarSprite = (options: BuildCarSpriteOptions): Container => {
  const root = new Container();
  const bodyColor = parseHexColor(options.colorHex);
  const recolor = (hex: number): number =>
    options.sold ? desaturateColor(hex) : hex;
  const accentAlpha = options.sold ? 0.4 : 1;

  const shadow = new Graphics();
  shadow.ellipse(0, CAR_HEIGHT / 2 + 6, CAR_WIDTH / 2.2, 6).fill({
    color: 0x000000,
    alpha: 0.22,
  });
  root.addChild(shadow);

  const body = new Graphics();
  body.roundRect(-CAR_WIDTH / 2, -8, CAR_WIDTH, 32, 10).fill({
    color: recolor(bodyColor),
  });
  body
    .moveTo(-CAR_WIDTH / 2 + 30, -8)
    .lineTo(-CAR_WIDTH / 2 + 60, -40)
    .lineTo(CAR_WIDTH / 2 - 60, -40)
    .lineTo(CAR_WIDTH / 2 - 30, -8)
    .closePath()
    .fill({ color: recolor(bodyColor) });
  root.addChild(body);

  const windshield = new Graphics();
  windshield
    .moveTo(-CAR_WIDTH / 2 + 36, -8)
    .lineTo(-CAR_WIDTH / 2 + 62, -36)
    .lineTo(CAR_WIDTH / 2 - 62, -36)
    .lineTo(CAR_WIDTH / 2 - 36, -8)
    .closePath()
    .fill({ color: recolor(0x223344), alpha: 0.95 });
  windshield
    .moveTo(-CAR_WIDTH / 2 + 40, -10)
    .lineTo(-CAR_WIDTH / 2 + 64, -32)
    .lineTo(-CAR_WIDTH / 2 + 60, -10)
    .closePath()
    .fill({ color: 0xffffff, alpha: accentAlpha * 0.35 });
  root.addChild(windshield);

  const trim = new Graphics();
  trim.rect(-CAR_WIDTH / 2 + 6, 6, CAR_WIDTH - 12, 3).fill({
    color: recolor(0x222222),
    alpha: 0.4,
  });
  root.addChild(trim);

  const wheelFront = new Graphics();
  wheelFront.circle(CAR_WIDTH / 2 - 32, 22, 12).fill({
    color: recolor(0x111111),
  });
  wheelFront.circle(CAR_WIDTH / 2 - 32, 22, 6).fill({
    color: recolor(0x777777),
  });
  root.addChild(wheelFront);

  const wheelRear = new Graphics();
  wheelRear.circle(-CAR_WIDTH / 2 + 32, 22, 12).fill({
    color: recolor(0x111111),
  });
  wheelRear.circle(-CAR_WIDTH / 2 + 32, 22, 6).fill({
    color: recolor(0x777777),
  });
  root.addChild(wheelRear);

  const headlight = new Graphics();
  headlight.ellipse(CAR_WIDTH / 2 - 6, -2, 6, 4).fill({
    color: 0xfff3a0,
    alpha: accentAlpha,
  });
  root.addChild(headlight);

  const plate = new Graphics();
  plate.rect(-CAR_WIDTH / 2 + 18, 4, 20, 8).fill({ color: 0xffffff });
  root.addChild(plate);

  const plateText = new Text({
    text: options.model.slice(0, 6).toUpperCase(),
    style: {
      fontFamily: "ui-monospace, Menlo, monospace",
      fontSize: 7,
      fontWeight: "700",
      fill: 0x222222,
    },
  });
  plateText.anchor.set(0.5);
  plateText.position.set(-CAR_WIDTH / 2 + 28, 8);
  root.addChild(plateText);

  if (options.sold) {
    const badge = buildSoldBadge({ width: CAR_WIDTH, height: CAR_HEIGHT });
    badge.position.set(-CAR_WIDTH / 2, -CAR_HEIGHT / 2);
    root.addChild(badge);
  }

  const scale = options.scale ?? 1;
  if (scale !== 1) {
    root.scale.set(scale);
  }

  return root;
};
