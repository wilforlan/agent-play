/**
 * Axis-aligned rectangle in world coordinates (grid units). Used by the server to clamp paths
 * and by the watch UI to clamp joystick-driven movement.
 *
 * @remarks **Consumers:** {@link clampWorldPosition}, {@link boundsContain}; server `PlayWorld` and
 * play-ui canvas both import these helpers from `@agent-play/sdk`.
 */
export type WorldBounds = {
  /** Inclusive minimum X. */
  minX: number;
  /** Inclusive minimum Y. */
  minY: number;
  /** Inclusive maximum X. */
  maxX: number;
  /** Inclusive maximum Y. */
  maxY: number;
};

/** Minimum playable span aligned with the watch canvas scrolling world (~20×20 cells). */
export const MINIMUM_PLAY_WORLD_BOUNDS: WorldBounds = {
  minX: 0,
  minY: 0,
  maxX: 19,
  maxY: 19,
};

export function expandBoundsToMinimumPlayArea(bounds: WorldBounds): WorldBounds {
  return {
    minX: Math.min(bounds.minX, MINIMUM_PLAY_WORLD_BOUNDS.minX),
    minY: Math.min(bounds.minY, MINIMUM_PLAY_WORLD_BOUNDS.minY),
    maxX: Math.max(bounds.maxX, MINIMUM_PLAY_WORLD_BOUNDS.maxX),
    maxY: Math.max(bounds.maxY, MINIMUM_PLAY_WORLD_BOUNDS.maxY),
  };
}

/**
 * Clamps a point to lie inside `bounds` along both axes.
 *
 * @param p - Position with `x` and `y` in world units.
 * @param bounds - Valid rectangle (`min` ≤ `max` per axis).
 * @returns Same point if inside, otherwise clamped to the nearest edge.
 *
 * @remarks **Callers:** server `PlayWorld` path enrichment; play-ui joystick and preview. **Callees:** `Math.min/Math.max`.
 */
export function clampWorldPosition(
  p: { x: number; y: number },
  bounds: WorldBounds
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(p.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(p.y, bounds.minY), bounds.maxY),
  };
}

/**
 * @returns Whether `p` lies inside or on the border of `bounds`.
 *
 * @remarks **Callers:** optional UI checks. **Callees:** none.
 */
export function boundsContain(
  bounds: WorldBounds,
  p: { x: number; y: number }
): boolean {
  return (
    p.x >= bounds.minX &&
    p.x <= bounds.maxX &&
    p.y >= bounds.minY &&
    p.y <= bounds.maxY
  );
}
