import { Graphics } from "pixi.js";

export type HousePalette = {
  wall: number;
  roof: number;
  door: number;
  window: number;
  trim: number;
};

export function drawHomeStructure(
  g: Graphics,
  box: number,
  house: HousePalette
): void {
  g.clear();
  const w = box * 1.35;
  const h = box * 1.4;
  const ox = -w * 0.5;
  const oy = -h * 0.85;
  g.moveTo(ox, oy + h * 0.38)
    .lineTo(ox + w * 0.5, oy + h * 0.02)
    .lineTo(ox + w, oy + h * 0.38)
    .closePath()
    .fill({ color: house.roof });
  g.rect(ox, oy + h * 0.38, w, h * 0.62).fill({ color: house.wall });
  g.rect(ox + w * 0.35, oy + h * 0.52, w * 0.18, h * 0.35).fill({
    color: house.door,
  });
  g.rect(ox + w * 0.1, oy + h * 0.48, w * 0.16, h * 0.14).fill({
    color: house.window,
  });
  g.rect(ox + w * 0.68, oy + h * 0.48, w * 0.16, h * 0.14).fill({
    color: house.window,
  });
  g.rect(ox + w * 0.1, oy + h * 0.48, w * 0.16, 2).fill({
    color: house.trim,
  });
  g.rect(ox + w * 0.68, oy + h * 0.48, w * 0.16, 2).fill({
    color: house.trim,
  });
}

export function drawToolPad(
  g: Graphics,
  box: number,
  fillCol: number,
  strokeCol: number
): void {
  g.clear();
  g.rect(0, 0, box, box).fill({ color: fillCol });
  g.rect(0, 0, box, box).stroke({ width: 1, color: strokeCol });
}
