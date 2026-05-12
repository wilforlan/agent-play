/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-stage-base
 *
 * Shared helpers used by every amenity stage (shop, supermarket, car wash).
 *
 * All three stages share:
 * - an exit door at stage-local `(0, 0)`,
 * - a spawn point chosen so it does not overlap the door,
 * - movement clamping inside the stage layout rect,
 * - a proximity scanner that returns the closest item slot.
 *
 * @see ./amenity-shop-stage.ts, ./amenity-supermarket-stage.ts,
 *      ./amenity-carwash-stage.ts — the three consumers.
 */

import {
  buildExitDoorSprite,
  EXIT_DOOR_PROXIMITY_RADIUS_WORLD,
  isWithinExitDoorProximity,
} from "./sprite-exit-door.js";
import type { Container } from "pixi.js";

export {
  buildExitDoorSprite,
  EXIT_DOOR_PROXIMITY_RADIUS_WORLD,
  isWithinExitDoorProximity,
};

/**
 * Rectangle defining a stage's walkable area in world cells.
 *
 * @public
 */
export type AmenityStageBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/**
 * Clamp a position to the supplied bounds.
 *
 * @public
 */
export const clampToBounds = (
  pos: { x: number; y: number },
  bounds: AmenityStageBounds
): { x: number; y: number } => ({
  x: Math.min(bounds.maxX, Math.max(bounds.minX, pos.x)),
  y: Math.min(bounds.maxY, Math.max(bounds.minY, pos.y)),
});

/**
 * Find the nearest slot whose centre is within `radius` of the player.
 *
 * @public
 */
export const findNearestSlot = <T extends { x: number; y: number }>(
  slots: ReadonlyArray<T>,
  playerWorld: { x: number; y: number },
  radius = 1.5
): T | null => {
  let best: T | null = null;
  let bestDistance = radius;
  for (const slot of slots) {
    const distance = Math.hypot(
      slot.x - playerWorld.x,
      slot.y - playerWorld.y
    );
    if (distance <= bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best;
};

/**
 * Mount the shared exit door onto the supplied stage root.
 *
 * @public
 */
export const mountExitDoor = (input: {
  root: Container;
  cellScale: number;
}): { x: number; y: number } => {
  const door = buildExitDoorSprite({ cellScale: input.cellScale });
  door.position.set(0, 0);
  input.root.addChild(door);
  return { x: 0, y: 0 };
};
