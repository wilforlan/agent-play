import { Container, Graphics, Text } from "pixi.js";
import type { WorldBounds } from "@agent-play/sdk/browser";
import { HOUSE_WORLD_X } from "@agent-play/sdk/browser";
import { cssColorToPixi, type MultiversePalette } from "./multiverse-engine.js";

type WorldToLocal = (wx: number, wy: number) => { x: number; y: number };

export type StreetSignZone = {
  id: string;
  streetLabel: string;
  rect: WorldBounds;
  scale?: number;
  lightCount?: number;
};

export type StreetSignMetrics = {
  poleW: number;
  poleH: number;
  panelW: number;
  panelH: number;
};

export type StreetLightMetrics = {
  poleW: number;
  poleH: number;
  lampW: number;
  lampH: number;
};

export const PARKING_STREET_SIGN_SCALE = 1.75;
export const PARKING_STREET_LIGHT_COUNT = 4;
/** World-X offset left of each house so poles sit beside the facade, not on it. */
export const PARKING_STREET_FURNITURE_BESIDE_OFFSET = 1.2;

const POLE_COLOR = 0x475569;
const POLE_HIGHLIGHT = 0x64748b;
const SIGN_PANEL_COLOR = 0x0f172a;
const LAMP_COLOR = 0xfde68a;
const LAMP_GLOW_COLOR = 0xfef3c7;

export const isParkingStreetSignZone = (zone: StreetSignZone): boolean => {
  return zone.lightCount !== undefined || zone.scale !== undefined;
};

export const parkingStreetFurnitureWorldY = (zone: StreetSignZone): number => {
  return zone.rect.maxY - 0.2;
};

export const parkingStreetLightWorldXs = (opts: {
  rect: WorldBounds;
  lightCount: number;
}): readonly number[] => {
  const count = Math.max(1, opts.lightCount);
  return Array.from({ length: count }, (_, index) => {
    const houseX = HOUSE_WORLD_X[index] ?? opts.rect.minX + index * 5;
    return houseX - PARKING_STREET_FURNITURE_BESIDE_OFFSET;
  });
};

export const parkingStreetSignWorldX = (): number => {
  const firstHouseX = HOUSE_WORLD_X[0] ?? 3;
  return firstHouseX - PARKING_STREET_FURNITURE_BESIDE_OFFSET * 2;
};

export function streetSignMetrics(opts: {
  cellScale: number;
  scale?: number;
}): StreetSignMetrics {
  const cellScale = opts.cellScale * (opts.scale ?? 1);
  return {
    poleW: Math.max(3, cellScale * 0.07),
    poleH: Math.max(28, cellScale * 0.85),
    panelW: Math.max(76, cellScale * 2.4),
    panelH: Math.max(16, cellScale * 0.38),
  };
}

export function streetLightMetrics(opts: {
  cellScale: number;
  scale?: number;
}): StreetLightMetrics {
  const cellScale = opts.cellScale * (opts.scale ?? 1);
  return {
    poleW: Math.max(2.6, cellScale * 0.06),
    poleH: Math.max(34, cellScale * 1.0),
    lampW: Math.max(10, cellScale * 0.28),
    lampH: Math.max(8, cellScale * 0.22),
  };
}

export function toStreetSignZones(
  zones: readonly {
    id: string;
    streetLabel: string;
    rect: WorldBounds;
    primaryGroup: string;
  }[]
): StreetSignZone[] {
  return zones
    .filter((zone) => zone.primaryGroup !== "education")
    .map((zone) => {
      const base: StreetSignZone = {
        id: zone.id,
        streetLabel: zone.streetLabel,
        rect: { ...zone.rect },
      };
      if (zone.primaryGroup !== "parking") {
        return base;
      }
      return {
        ...base,
        scale: PARKING_STREET_SIGN_SCALE,
        lightCount: PARKING_STREET_LIGHT_COUNT,
      };
    });
}

export function buildTSignPost(opts: {
  palette: MultiversePalette;
  cellScale: number;
  label: string;
  scale?: number;
}): Container {
  const { palette, label } = opts;
  const root = new Container();
  const strokeColor = cssColorToPixi(palette.stroke);
  const textColor = 0xffffff;
  const { poleW, poleH, panelW, panelH } = streetSignMetrics({
    cellScale: opts.cellScale,
    scale: opts.scale,
  });

  const pole = new Graphics({ roundPixels: true });
  pole.rect(-poleW / 2, -poleH, poleW, poleH);
  pole.fill({ color: POLE_COLOR, alpha: 0.95 });
  pole.stroke({ width: 1, color: strokeColor, alpha: 0.8 });
  pole.moveTo(-poleW / 2 + 0.5, -poleH + 1);
  pole.lineTo(-poleW / 2 + 0.5, -1);
  pole.stroke({ width: 0.5, color: POLE_HIGHLIGHT, alpha: 0.6 });
  root.addChild(pole);

  const panel = new Graphics({ roundPixels: true });
  const panelTop = -poleH - panelH;
  panel.roundRect(-panelW / 2, panelTop, panelW, panelH, 3);
  panel.fill({ color: SIGN_PANEL_COLOR, alpha: 0.95 });
  panel.stroke({ width: 1, color: strokeColor, alpha: 0.9 });
  panel.moveTo(-panelW / 2 + 3, panelTop + panelH - 1);
  panel.lineTo(panelW / 2 - 3, panelTop + panelH - 1);
  panel.stroke({ width: 0.6, color: 0x000000, alpha: 0.35 });
  root.addChild(panel);

  const text = new Text({
    text: label,
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(9, Math.round(panelH * 0.55)),
      fontWeight: "600",
      fill: textColor,
      align: "center",
    },
  });
  text.anchor.set(0.5, 0.5);
  text.position.set(0, panelTop + panelH / 2);
  root.addChild(text);

  return root;
}

export function buildStreetLightPost(opts: {
  palette: MultiversePalette;
  cellScale: number;
  scale?: number;
}): Container {
  const { palette } = opts;
  const root = new Container();
  const strokeColor = cssColorToPixi(palette.stroke);
  const { poleW, poleH, lampW, lampH } = streetLightMetrics({
    cellScale: opts.cellScale,
    scale: opts.scale,
  });
  const lampRadius = Math.min(lampW, lampH) * 0.4;
  const scale = opts.scale ?? 1;

  const glow = new Graphics({ roundPixels: false });
  const glowR = Math.max(14, opts.cellScale * scale * 0.6);
  glow.circle(0, -poleH - lampH * 0.5, glowR);
  glow.fill({ color: LAMP_GLOW_COLOR, alpha: 0.16 });
  root.addChild(glow);

  const pole = new Graphics({ roundPixels: true });
  pole.rect(-poleW / 2, -poleH, poleW, poleH);
  pole.fill({ color: POLE_COLOR, alpha: 0.95 });
  pole.stroke({ width: 1, color: strokeColor, alpha: 0.8 });
  pole.moveTo(-poleW / 2 + 0.5, -poleH + 1);
  pole.lineTo(-poleW / 2 + 0.5, -1);
  pole.stroke({ width: 0.5, color: POLE_HIGHLIGHT, alpha: 0.6 });
  root.addChild(pole);

  const fixture = new Graphics({ roundPixels: true });
  const fixtureH = Math.max(3, opts.cellScale * scale * 0.08);
  fixture.rect(-lampW / 2, -poleH - fixtureH, lampW, fixtureH);
  fixture.fill({ color: POLE_COLOR, alpha: 0.95 });
  fixture.stroke({ width: 1, color: strokeColor, alpha: 0.85 });
  root.addChild(fixture);

  const lamp = new Graphics({ roundPixels: true });
  const lampTop = -poleH - fixtureH - lampH;
  lamp.roundRect(-lampW / 2, lampTop, lampW, lampH, lampRadius);
  lamp.fill({ color: LAMP_COLOR, alpha: 0.96 });
  lamp.stroke({ width: 1, color: strokeColor, alpha: 0.85 });
  root.addChild(lamp);

  const highlight = new Graphics({ roundPixels: true });
  highlight.roundRect(
    -lampW / 2 + lampRadius * 0.4,
    lampTop + lampRadius * 0.25,
    Math.max(2, lampW * 0.35),
    Math.max(1.5, lampH * 0.2),
    lampRadius * 0.5
  );
  highlight.fill({ color: 0xffffff, alpha: 0.55 });
  root.addChild(highlight);

  return root;
}

const lightWorldXForZone = (opts: {
  zone: StreetSignZone;
  index: number;
  lightCount: number;
}): number => {
  const { zone, index, lightCount } = opts;
  if (isParkingStreetSignZone(zone)) {
    const xs = parkingStreetLightWorldXs({
      rect: zone.rect,
      lightCount,
    });
    return xs[index] ?? zone.rect.minX;
  }
  if (lightCount <= 1) {
    return Math.min(zone.rect.maxX + 1 - 0.25, zone.rect.maxX + 0.75);
  }
  const span = zone.rect.maxX - zone.rect.minX + 1;
  const inset = Math.min(0.75, span * 0.08);
  const usable = Math.max(span - inset * 2, 0.1);
  return zone.rect.minX + inset + ((index + 0.5) / lightCount) * usable;
};

const signWorldXForZone = (zone: StreetSignZone): number => {
  if (isParkingStreetSignZone(zone)) {
    return parkingStreetSignWorldX();
  }
  return (zone.rect.minX + zone.rect.maxX + 1) / 2;
};

const furnitureWorldYForZone = (zone: StreetSignZone): number => {
  if (isParkingStreetSignZone(zone)) {
    return parkingStreetFurnitureWorldY(zone);
  }
  return zone.rect.maxY + 1;
};

export function mountStreetSignPosts(options: {
  layer: Container;
  palette: MultiversePalette;
  worldToLocal: WorldToLocal;
  cellScale: number;
  zones: readonly StreetSignZone[];
}): void {
  const { layer, palette, worldToLocal, cellScale, zones } = options;
  for (const ch of [...layer.children]) {
    layer.removeChild(ch);
    ch.destroy({ children: true });
  }
  for (const zone of zones) {
    const furnitureY = furnitureWorldYForZone(zone);
    const signAnchor = worldToLocal(signWorldXForZone(zone), furnitureY);
    const signPost = buildTSignPost({
      palette,
      cellScale,
      label: zone.streetLabel,
      scale: zone.scale,
    });
    signPost.position.set(signAnchor.x, signAnchor.y);
    layer.addChild(signPost);

    const lightCount = Math.max(1, zone.lightCount ?? 1);
    for (let i = 0; i < lightCount; i += 1) {
      const lightX = lightWorldXForZone({ zone, index: i, lightCount });
      const lightAnchor = worldToLocal(lightX, furnitureY);
      const lightPost = buildStreetLightPost({
        palette,
        cellScale,
        scale: zone.scale,
      });
      lightPost.position.set(lightAnchor.x, lightAnchor.y);
      layer.addChild(lightPost);
    }
  }
}
