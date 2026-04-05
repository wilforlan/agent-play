const DEFAULT_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 3,
  maxY: 3,
};

export function buildWorldMapFromOccupants<T extends { x: number; y: number }>(
  occupants: T[]
): { bounds: typeof DEFAULT_BOUNDS; occupants: T[] } {
  if (occupants.length === 0) {
    return { bounds: DEFAULT_BOUNDS, occupants: [] };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const o of occupants) {
    minX = Math.min(minX, o.x);
    minY = Math.min(minY, o.y);
    maxX = Math.max(maxX, o.x);
    maxY = Math.max(maxY, o.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { bounds: DEFAULT_BOUNDS, occupants };
  }
  return {
    bounds: { minX, minY, maxX, maxY },
    occupants,
  };
}
