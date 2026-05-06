/**
 * @module @agent-play/play-ui/structure-art
 * structure art — preview canvas module (Pixi + DOM).
 */
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

export type AmenityBuildingPalette = {
  facade: number;
  roof: number;
  trim: number;
  accent: number;
  glass?: number;
};

export function drawSupermarketStructure(
  graph: Graphics,
  box: number,
  colors: AmenityBuildingPalette
): void {
  graph.clear();
  const w = box * 1.5;
  const h = box * 1.2;
  const ox = -w * 0.48;
  const oy = -h * 0.68;
  graph.rect(ox, oy, w, h * 0.72).fill({ color: colors.facade });
  graph
    .moveTo(ox - w * 0.04, oy)
    .lineTo(ox + w * 0.5, oy - h * 0.22)
    .lineTo(ox + w * 1.04, oy)
    .closePath()
    .fill({ color: colors.roof });
  const signY = oy + h * 0.08;
  graph.rect(ox + w * 0.12, signY, w * 0.76, h * 0.14).fill({ color: colors.accent });
  graph.rect(ox + w * 0.12, signY, w * 0.76, h * 0.14).stroke({
    width: 1,
    color: colors.trim,
  });
  const gw = w * 0.22;
  const gtop = oy + h * 0.34;
  const gh = h * 0.34;
  for (let i = 0; i < 4; i += 1) {
    const gx = ox + w * 0.1 + i * (gw + w * 0.04);
    graph.rect(gx, gtop, gw, gh).fill({
      color: colors.glass ?? colors.accent,
      alpha: 0.35,
    });
    graph.rect(gx, gtop, gw, gh).stroke({ width: 1, color: colors.trim });
  }
  graph.rect(ox, oy, w, h * 0.72).stroke({ width: 1.5, color: colors.trim });
}

export function drawShopStructure(
  graph: Graphics,
  box: number,
  colors: AmenityBuildingPalette
): void {
  graph.clear();
  const w = box * 1.25;
  const h = box * 1.05;
  const ox = -w * 0.46;
  const oy = -h * 0.58;
  graph.rect(ox, oy, w, h * 0.68).fill({ color: colors.facade });
  graph
    .moveTo(ox - w * 0.05, oy + h * 0.02)
    .lineTo(ox + w * 0.5, oy - h * 0.18)
    .lineTo(ox + w * 1.05, oy + h * 0.02)
    .closePath()
    .fill({ color: colors.roof });
  graph.rect(ox + w * 0.62, oy + h * 0.28, w * 0.28, h * 0.38).fill({
    color: colors.accent,
  });
  graph.rect(ox + w * 0.1, oy + h * 0.32, w * 0.38, h * 0.28).fill({
    color: colors.glass ?? colors.accent,
    alpha: 0.4,
  });
  graph.rect(ox, oy, w, h * 0.68).stroke({ width: 1.2, color: colors.trim });
}

export function drawCarWashStructure(
  graph: Graphics,
  box: number,
  colors: AmenityBuildingPalette
): void {
  graph.clear();
  const w = box * 1.55;
  const h = box * 0.95;
  const ox = -w * 0.48;
  const oy = -h * 0.52;
  graph.rect(ox, oy, w, h * 0.55).fill({ color: colors.facade });
  graph
    .arc(ox + w * 0.5, oy + h * 0.62, w * 0.42, Math.PI, 0, false)
    .stroke({ width: h * 0.08, color: colors.accent });
  graph
    .arc(ox + w * 0.5, oy + h * 0.62, w * 0.32, Math.PI, 0, false)
    .stroke({ width: h * 0.05, color: colors.trim });
  graph.rect(ox + w * 0.35, oy + h * 0.08, w * 0.3, h * 0.12).fill({
    color: colors.roof,
  });
  graph.rect(ox, oy, w, h * 0.55).stroke({ width: 1.2, color: colors.trim });
}
