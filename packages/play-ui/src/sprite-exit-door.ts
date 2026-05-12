/**
 * @packageDocumentation
 * @module @agent-play/play-ui/sprite-exit-door
 *
 * Shared exit-door sprite mounted at stage-local `(0, 0)` on every
 * non-overworld stage (space yard + the three amenity stages).
 *
 * Walking into the door (within {@link EXIT_DOOR_PROXIMITY_RADIUS_WORLD})
 * triggers the same stage transition as pressing `Esc`. The visual is
 * deliberately legible from a distance — a green frame, a door panel with
 * a bright `EXIT` label, and a glowing arrow pointing toward the
 * out-of-stage direction.
 *
 * @see ./space-yard-stage.ts, ./amenity-shop-stage.ts,
 *      ./amenity-supermarket-stage.ts, ./amenity-carwash-stage.ts — every
 *      stage that mounts this sprite.
 * @see ./stage-controller.ts for the controller `back()` call the host
 *      wires when the player crosses the proximity radius.
 */

import { Container, Graphics, Text } from "pixi.js";

/**
 * World-space proximity radius for the exit door.
 *
 * @remarks
 * Expressed in world cells. Hosts compute the player's distance to the
 * door anchor and call `stageController.back()` once it drops below this
 * value. The radius is intentionally generous (≈ 1.5 cells) so the door
 * fires reliably with a casual step in.
 *
 * @public
 */
export const EXIT_DOOR_PROXIMITY_RADIUS_WORLD = 1.5;

const FRAME_COLOR = 0x2a8a36;
const FRAME_HIGHLIGHT_COLOR = 0x44b955;
const DOOR_PANEL_COLOR = 0x115a1d;
const DOOR_HANDLE_COLOR = 0xffd84d;
const SIGN_BG_COLOR = 0xfffae0;
const SIGN_TEXT_COLOR = 0x222222;
const ARROW_COLOR = 0xffffff;

/**
 * Options accepted by {@link buildExitDoorSprite}.
 *
 * @public
 */
export type BuildExitDoorSpriteOptions = {
  /** Pixel size of one world cell, used to scale the door art. */
  cellScale: number;
};

/**
 * Build the exit-door sprite, anchored at stage-local `(0, 0)`.
 *
 * @example
 * ```ts
 * const door = buildExitDoorSprite({ cellScale: 28 });
 * door.position.set(originX, originY); // origin in world-root local coords
 * worldRoot.addChild(door);
 * ```
 *
 * @public
 */
export const buildExitDoorSprite = (
  options: BuildExitDoorSpriteOptions
): Container => {
  const container = new Container();
  const s = options.cellScale;
  container.scale.set(s / 24);

  const frame = new Graphics();
  frame.rect(-22, -50, 44, 56).fill({ color: FRAME_COLOR });
  frame.rect(-22, -50, 44, 4).fill({ color: FRAME_HIGHLIGHT_COLOR });
  container.addChild(frame);

  const panel = new Graphics();
  panel.rect(-18, -44, 36, 48).fill({ color: DOOR_PANEL_COLOR });
  panel.rect(-16, -42, 32, 22).fill({ color: 0x0f4216, alpha: 0.5 });
  container.addChild(panel);

  const handle = new Graphics();
  handle.circle(11, -20, 1.6).fill({ color: DOOR_HANDLE_COLOR });
  container.addChild(handle);

  const sign = new Graphics();
  sign.rect(-16, -58, 32, 10).fill({ color: SIGN_BG_COLOR });
  sign.rect(-16, -58, 32, 10).stroke({ color: FRAME_COLOR, width: 1.4 });
  container.addChild(sign);

  const signText = new Text({
    text: "EXIT",
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 8,
      fontWeight: "900",
      fill: SIGN_TEXT_COLOR,
      letterSpacing: 1,
    },
  });
  signText.anchor.set(0.5);
  signText.position.set(0, -53);
  container.addChild(signText);

  const arrow = new Graphics();
  arrow
    .moveTo(0, 0)
    .lineTo(0, 8)
    .lineTo(-4, 4)
    .moveTo(0, 8)
    .lineTo(4, 4)
    .stroke({ color: ARROW_COLOR, width: 2, alpha: 0.85 });
  container.addChild(arrow);

  container.x = 0;
  container.y = 0;
  return container;
};

/**
 * Whether the player foot-point is within proximity of the exit door.
 *
 * @example
 * ```ts
 * if (isWithinExitDoorProximity({ playerWorld, doorWorld })) {
 *   await stageController.back();
 * }
 * ```
 *
 * @public
 */
export const isWithinExitDoorProximity = (input: {
  playerWorld: { x: number; y: number };
  doorWorld: { x: number; y: number };
  radius?: number;
}): boolean => {
  const radius = input.radius ?? EXIT_DOOR_PROXIMITY_RADIUS_WORLD;
  const dx = input.playerWorld.x - input.doorWorld.x;
  const dy = input.playerWorld.y - input.doorWorld.y;
  return Math.hypot(dx, dy) <= radius;
};
