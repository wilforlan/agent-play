import { Graphics } from "pixi.js";

export const drawHouseBed = (
  g: Graphics,
  cellScale: number,
  variant: string
): void => {
  g.clear();
  const w = cellScale * (variant === "bunk" ? 1.4 : 1.8);
  const h = cellScale * (variant === "bunk" ? 1.0 : 0.9);
  g.rect(-w * 0.5, -h * 0.5, w, h).fill({ color: 0x8b5e3c });
  g.rect(-w * 0.42, -h * 0.42, w * 0.84, h * 0.55).fill({ color: 0xf5e6d3 });
  if (variant === "bunk") {
    g.rect(-w * 0.42, -h * 0.05, w * 0.84, h * 0.35).fill({ color: 0xe8d5b7 });
  }
};

export const drawHouseWardrobe = (
  g: Graphics,
  cellScale: number,
  variant: string
): void => {
  g.clear();
  const w = cellScale * (variant === "double" ? 1.6 : 1.1);
  const h = cellScale * 1.8;
  g.rect(-w * 0.5, -h, w, h).fill({ color: 0x5d4037 });
  g.rect(-w * 0.42, -h * 0.92, w * 0.84, h * 0.84).fill({ color: 0x795548 });
  g.moveTo(0, -h * 0.92).lineTo(0, -h * 0.08).stroke({ color: 0x3e2723, width: 1 });
};

export const drawHouseMirror = (
  g: Graphics,
  cellScale: number,
  variant: string
): void => {
  g.clear();
  const w = cellScale * (variant === "standing" ? 0.7 : 1.2);
  const h = cellScale * (variant === "standing" ? 1.4 : 0.8);
  g.rect(-w * 0.5, -h, w, h).fill({ color: 0xb0bec5, alpha: 0.9 });
  g.rect(-w * 0.42, -h * 0.92, w * 0.84, h * 0.84).fill({ color: 0xe3f2fd, alpha: 0.85 });
};

export const drawHouseWindow = (
  g: Graphics,
  cellScale: number,
  variant: string
): void => {
  g.clear();
  const w = cellScale * (variant === "double" ? 1.6 : variant === "tall" ? 0.9 : 1.1);
  const h = cellScale * (variant === "tall" ? 1.4 : 0.7);
  g.rect(-w * 0.5, -h, w, h).fill({ color: 0x90caf9, alpha: 0.85 });
  g.moveTo(0, -h).lineTo(0, 0).stroke({ color: 0xffffff, width: 1 });
  if (variant === "double") {
    g.moveTo(-w * 0.25, -h).lineTo(-w * 0.25, 0).stroke({ color: 0xffffff, width: 1 });
    g.moveTo(w * 0.25, -h).lineTo(w * 0.25, 0).stroke({ color: 0xffffff, width: 1 });
  }
};

export const buildHouseFixtureGraphic = (input: {
  kind: "bed" | "wardrobe" | "mirror" | "window";
  variant: string;
  cellScale: number;
}): Graphics => {
  const g = new Graphics();
  if (input.kind === "bed") {
    drawHouseBed(g, input.cellScale, input.variant);
  } else if (input.kind === "wardrobe") {
    drawHouseWardrobe(g, input.cellScale, input.variant);
  } else if (input.kind === "mirror") {
    drawHouseMirror(g, input.cellScale, input.variant);
  } else {
    drawHouseWindow(g, input.cellScale, input.variant);
  }
  return g;
};
