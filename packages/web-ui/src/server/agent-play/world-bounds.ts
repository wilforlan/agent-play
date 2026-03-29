export type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function clampWorldPosition(
  p: { x: number; y: number },
  bounds: WorldBounds
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(p.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(p.y, bounds.minY), bounds.maxY),
  };
}

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
