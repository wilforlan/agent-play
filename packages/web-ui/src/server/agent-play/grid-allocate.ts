import type { PreviewSnapshotJson } from "./preview-serialize.js";

const GRID_SCAN_WIDTH = 12;

export function occupiedKeysFromSnapshot(
  snapshot: PreviewSnapshotJson
): Set<string> {
  const s = new Set<string>();
  for (const o of snapshot.worldMap.occupants) {
    s.add(`${Math.round(o.x)},${Math.round(o.y)}`);
  }
  return s;
}

export function computeFreeMapCell(
  occupied: ReadonlySet<string>,
  laneIndex: number
): { x: number; y: number } {
  const baseY = laneIndex * 3;
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const x = attempt % GRID_SCAN_WIDTH;
    const y = baseY + Math.floor(attempt / GRID_SCAN_WIDTH);
    const key = `${x},${y}`;
    if (!occupied.has(key)) {
      return { x, y };
    }
  }
  throw new Error("computeFreeMapCell: no free grid cell");
}
