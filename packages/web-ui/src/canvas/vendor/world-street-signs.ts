import { Container, Graphics, Text } from "pixi.js";
import { cssColorToPixi, type MultiversePalette } from "./multiverse-engine.js";
import { STREETS } from "./world-streets.js";

type WorldToLocal = (wx: number, wy: number) => { x: number; y: number };

export function mountStreetSignPosts(options: {
  layer: Container;
  palette: MultiversePalette;
  worldToLocal: WorldToLocal;
  cellScale: number;
}): void {
  const { layer, palette, worldToLocal, cellScale } = options;
  for (const ch of [...layer.children]) {
    layer.removeChild(ch);
    ch.destroy({ children: true });
  }
  const stroke = cssColorToPixi(palette.stroke);
  const fill = cssColorToPixi(palette.text);
  const w = Math.max(72, cellScale * 2.4);
  const h = 22;
  for (const s of STREETS) {
    const { x: lx, y: ly } = worldToLocal(s.anchorWorld.x, s.anchorWorld.y);
    const post = new Graphics({ roundPixels: true });
    post.roundRect(-w / 2, -h - cellScale * 0.15, w, h, 4);
    post.fill({ color: 0x1e293b, alpha: 0.92 });
    post.stroke({ width: 1, color: stroke, alpha: 0.85 });
    post.position.set(lx, ly - cellScale * 0.35);
    const cap = new Text({
      text: s.label,
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
