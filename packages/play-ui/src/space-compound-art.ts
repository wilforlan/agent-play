/**
 * @module @agent-play/play-ui/space-compound-art
 * Fence + amenity layout for space-backed structures on the preview canvas.
 */
import type { Graphics } from "pixi.js";

export function layoutCompoundAmenityOffsetsWorld(options: {
  count: number;
  radiusWorld: number;
}): readonly { dx: number; dy: number }[] {
  const { count, radiusWorld } = options;
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ dx: 0, dy: 0 }];
  }
  const out: { dx: number; dy: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    out.push({
      dx: Math.cos(angle) * radiusWorld,
      dy: Math.sin(angle) * radiusWorld,
    });
  }
  return out;
}

export function compoundFenceRadiusPx(options: {
  amenityCount: number;
  cellScale: number;
}): number {
  const { amenityCount, cellScale } = options;
  if (amenityCount <= 1) {
    return cellScale * 3.2;
  }
  const extra = Math.min(3, Math.max(0, amenityCount - 3));
  return cellScale * (4.2 + extra);
}

export function drawSpaceCompoundFence(
  g: Graphics,
  radiusPx: number,
  strokeColor: number
): void {
  g.clear();
  const r = radiusPx;
  const posts = 14;
  for (let i = 0; i < posts; i += 1) {
    const a0 = (2 * Math.PI * i) / posts;
    const a1 = (2 * Math.PI * (i + 1)) / posts;
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    g.moveTo(x0, y0)
      .lineTo(x1, y1)
      .stroke({ width: 2.5, color: strokeColor, alpha: 0.88 });
  }
  for (let i = 0; i < posts; i += 2) {
    const a = (2 * Math.PI * i) / posts;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    g.rect(x - 3, y - 5, 6, 10).fill({ color: 0x78350f, alpha: 0.95 });
    g.rect(x - 3, y - 5, 6, 10).stroke({ width: 1, color: 0xfbbf24, alpha: 0.7 });
  }
}
