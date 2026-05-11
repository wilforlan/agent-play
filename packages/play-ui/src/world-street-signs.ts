import { Container, Graphics, Text } from "pixi.js";
import type { WorldBounds } from "@agent-play/sdk/browser";
import { cssColorToPixi, type MultiversePalette } from "./multiverse-engine.js";

type WorldToLocal = (wx: number, wy: number) => { x: number; y: number };

export type StreetSignZone = {
  id: string;
  streetLabel: string;
  rect: WorldBounds;
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
  const stroke = cssColorToPixi(palette.stroke);
  const fill = cssColorToPixi(palette.text);
  const w = Math.max(72, cellScale * 2.4);
  const h = 22;
  for (const zone of zones) {
    const cx = (zone.rect.minX + zone.rect.maxX + 1) / 2;
    const topY = zone.rect.maxY;
    const { x: lx, y: ly } = worldToLocal(cx, topY);
    const post = new Graphics({ roundPixels: true });
    post.roundRect(-w / 2, -h - cellScale * 0.15, w, h, 4);
    post.fill({ color: 0x1e293b, alpha: 0.92 });
    post.stroke({ width: 1, color: stroke, alpha: 0.85 });
    post.position.set(lx, ly - cellScale * 0.35);
    const cap = new Text({
      text: zone.streetLabel,
      style: {
        fontFamily: "ui-monospace, monospace",
        fontSize: 9,
        fontWeight: "600",
        fill,
        wordWrap: true,
        wordWrapWidth: w - 8,
        align: "center",
      },
    });
    cap.anchor.set(0.5, 1);
    cap.position.set(lx, ly - cellScale * 0.42);
    layer.addChild(post);
    layer.addChild(cap);
  }
}
