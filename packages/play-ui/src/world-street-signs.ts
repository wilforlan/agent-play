import { Container, Graphics, Text } from "pixi.js";
import type { WorldBounds } from "@agent-play/sdk/browser";
import { cssColorToPixi, type MultiversePalette } from "./multiverse-engine.js";

type WorldToLocal = (wx: number, wy: number) => { x: number; y: number };

export type StreetSignZone = {
  id: string;
  streetLabel: string;
  rect: WorldBounds;
};

const POLE_COLOR = 0x475569;
const POLE_HIGHLIGHT = 0x64748b;
const SIGN_PANEL_COLOR = 0x0f172a;
const LAMP_COLOR = 0xfde68a;
const LAMP_GLOW_COLOR = 0xfef3c7;

export function buildTSignPost(opts: {
  palette: MultiversePalette;
  cellScale: number;
  label: string;
}): Container {
  const { palette, cellScale, label } = opts;
  const root = new Container();
  const strokeColor = cssColorToPixi(palette.stroke);
  const textColor = 0xffffff;

  const poleW = Math.max(3, cellScale * 0.07);
  const poleH = Math.max(28, cellScale * 0.85);
  const panelW = Math.max(76, cellScale * 2.4);
  const panelH = Math.max(16, cellScale * 0.38);

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

function buildStreetLightPost(opts: {
  palette: MultiversePalette;
  cellScale: number;
}): Container {
  const { palette, cellScale } = opts;
  const root = new Container();
  const strokeColor = cssColorToPixi(palette.stroke);

  const poleW = Math.max(2.6, cellScale * 0.06);
  const poleH = Math.max(34, cellScale * 1.0);
  const lampW = Math.max(10, cellScale * 0.28);
  const lampH = Math.max(8, cellScale * 0.22);
  const lampRadius = Math.min(lampW, lampH) * 0.4;

  const glow = new Graphics({ roundPixels: false });
  const glowR = Math.max(14, cellScale * 0.6);
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
  const fixtureH = Math.max(3, cellScale * 0.08);
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
    const centerX = (zone.rect.minX + zone.rect.maxX + 1) / 2;
    const topY = zone.rect.maxY + 1;
    const signAnchor = worldToLocal(centerX, topY);
    const signPost = buildTSignPost({
      palette,
      cellScale,
      label: zone.streetLabel,
    });
    signPost.position.set(signAnchor.x, signAnchor.y);
    layer.addChild(signPost);

    const lightX = Math.min(zone.rect.maxX + 1 - 0.25, zone.rect.maxX + 0.75);
    const lightAnchor = worldToLocal(lightX, topY);
    const lightPost = buildStreetLightPost({ palette, cellScale });
    lightPost.position.set(lightAnchor.x, lightAnchor.y);
    layer.addChild(lightPost);
  }
}
