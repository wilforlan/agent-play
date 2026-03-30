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

export function drawVendorStall(
  g: Graphics,
  box: number,
  colors: {
    awning: number;
    body: number;
    stripe: number;
    trim: number;
  }
): void {
  g.clear();
  const w = box * 1.15;
  const h = box * 0.95;
  const ox = -w * 0.45;
  const oy = -h * 0.55;
  g.rect(ox, oy, w, h * 0.62).fill({ color: colors.body });
  g.rect(ox, oy + h * 0.52, w, h * 0.2).fill({ color: colors.trim });
  const awH = h * 0.28;
  g.moveTo(ox - w * 0.06, oy)
    .lineTo(ox + w * 0.5, oy - awH)
    .lineTo(ox + w * 1.06, oy)
    .closePath()
    .fill({ color: colors.awning });
  const stripeW = w / 5;
  for (let i = 0; i < 5; i += 1) {
    const sx = ox + i * stripeW;
    g.rect(sx, oy - awH * 0.85, stripeW * 0.45, awH * 0.9).fill({
      color: colors.stripe,
      alpha: i % 2 === 0 ? 0.55 : 0.35,
    });
  }
  g.rect(ox, oy, w, h * 0.62).stroke({ width: 1, color: colors.trim });
}

export function drawMcpStore(
  g: Graphics,
  box: number,
  colors: {
    facade: number;
    accent: number;
    glass: number;
    sign: number;
    trim: number;
  }
): void {
  g.clear();
  const w = box * 1.55;
  const h = box * 1.25;
  const ox = -w * 0.48;
  const oy = -h * 0.72;
  g.rect(ox, oy, w, h).fill({ color: colors.facade });
  g.rect(ox + w * 0.08, oy + h * 0.22, w * 0.84, h * 0.28).fill({
    color: colors.sign,
  });
  g.rect(ox + w * 0.08, oy + h * 0.22, w * 0.84, h * 0.28).stroke({
    width: 1,
    color: colors.trim,
  });
  const gw = w * 0.28;
  const gh = h * 0.42;
  const gy = oy + h * 0.52;
  g.rect(ox + w * 0.1, gy, gw, gh).fill({ color: colors.glass });
  g.rect(ox + w * 0.42, gy, gw, gh).fill({ color: colors.glass });
  g.rect(ox + w * 0.74, gy, gw * 0.9, gh).fill({ color: colors.glass });
  g.rect(ox + w * 0.1, gy, gw, gh).stroke({ width: 1, color: colors.accent });
  g.rect(ox + w * 0.42, gy, gw, gh).stroke({ width: 1, color: colors.accent });
  g.rect(ox + w * 0.74, gy, gw * 0.9, gh).stroke({
    width: 1,
    color: colors.accent,
  });
  g.moveTo(ox, oy + h * 0.12)
    .lineTo(ox + w * 0.5, oy - h * 0.1)
    .lineTo(ox + w, oy + h * 0.12)
    .closePath()
    .fill({ color: colors.accent, alpha: 0.5 });
  g.rect(ox, oy, w, h).stroke({ width: 1.5, color: colors.trim });
}
