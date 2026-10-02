import { Container, Graphics, Text } from "pixi.js";
import type { WorldBounds } from "@agent-play/sdk/browser";
import { cssColorToPixi, type MultiversePalette } from "./multiverse-engine.js";
import { buildStreetLightPost } from "./world-street-signs.js";
import { computeBandPixelExtents } from "./parking-street-layer.js";

export const EDUCATION_STREET_LIGHT_COUNT = 4;
export const EDUCATION_STREET_NAME = "Elm Street";
export const EDUCATION_CENTER_COUNT = 4;
export const EDUCATION_LIGHT_BESIDE_OFFSET = 1.35;

export type EducationCampusZone = {
  id: string;
  streetLabel: string;
  rect: WorldBounds;
  primaryGroup: string;
};

export type EducationCenterSpec = {
  id: string;
  label: string;
  wall: number;
  roof: number;
  accent: number;
  tower: boolean;
};

export type EducationCenterAnchor = {
  centerId: string;
  label: string;
  x: number;
  y: number;
};

export const EDUCATION_CENTER_SPECS: readonly EducationCenterSpec[] = [
  {
    id: "foundations-hall",
    label: "Foundations",
    wall: 0xb45309,
    roof: 0x7c2d12,
    accent: 0xfbbf24,
    tower: false,
  },
  {
    id: "curriculum-tower",
    label: "Curriculum",
    wall: 0x64748b,
    roof: 0x334155,
    accent: 0x94a3b8,
    tower: true,
  },
  {
    id: "assessment-atelier",
    label: "Assessment",
    wall: 0x0f766e,
    roof: 0xb45309,
    accent: 0x5eead4,
    tower: false,
  },
  {
    id: "classroom-studio",
    label: "Classroom",
    wall: 0x1d4ed8,
    roof: 0x1e3a8a,
    accent: 0x93c5fd,
    tower: false,
  },
] as const;

export const pickEducationCampusZone = (
  zones: readonly EducationCampusZone[]
): EducationCampusZone | undefined => {
  return zones.find((zone) => zone.primaryGroup === "education");
};

export const educationCenterWorldXs = (opts: {
  rect: WorldBounds;
  centerCount: number;
}): readonly number[] => {
  const count = Math.max(1, opts.centerCount);
  const inset = 2.2;
  const usable = Math.max(0.1, opts.rect.maxX - opts.rect.minX - inset * 2);
  return Array.from({ length: count }, (_, index) => {
    return opts.rect.minX + inset + ((index + 0.5) / count) * usable;
  });
};

export const educationBuildingBaseY = (zoneRect: WorldBounds): number =>
  zoneRect.minY + 0.55;

export const buildEducationCenterAnchors = (opts: {
  bandRect: WorldBounds;
  zoneRect: WorldBounds;
  centerCount?: number;
}): readonly EducationCenterAnchor[] => {
  const centerCount = Math.min(
    opts.centerCount ?? EDUCATION_CENTER_COUNT,
    EDUCATION_CENTER_SPECS.length
  );
  const xs = educationCenterWorldXs({
    rect: opts.bandRect,
    centerCount,
  });
  const y = educationBuildingBaseY(opts.zoneRect);
  const anchors: EducationCenterAnchor[] = [];
  for (let i = 0; i < xs.length; i += 1) {
    const x = xs[i];
    const spec = EDUCATION_CENTER_SPECS[i];
    if (x === undefined || spec === undefined) {
      continue;
    }
    anchors.push({
      centerId: spec.id,
      label: spec.label,
      x,
      y,
    });
  }
  return anchors;
};

export const educationLightWorldPosition = (opts: {
  buildingX: number;
  buildingY: number;
}): { x: number; y: number } => ({
  x: opts.buildingX - EDUCATION_LIGHT_BESIDE_OFFSET,
  y: opts.buildingY,
});

export const drawEducationCenterBuilding = (opts: {
  g: Graphics;
  cellScale: number;
  spec: EducationCenterSpec;
}): void => {
  const { g, cellScale, spec } = opts;
  g.clear();
  const w = cellScale * (spec.tower ? 2.4 : 2.8);
  const h = cellScale * (spec.tower ? 3.2 : 2.6);
  const ox = -w * 0.5;
  const oy = -h;

  g.rect(ox + w * 0.08, oy + h * 0.92, w * 0.84, h * 0.1).fill({
    color: 0x292524,
    alpha: 0.55,
  });

  if (spec.tower) {
    g.rect(ox + w * 0.32, oy, w * 0.36, h * 0.42).fill({ color: spec.wall });
    g.rect(ox + w * 0.28, oy - cellScale * 0.12, w * 0.44, cellScale * 0.14).fill({
      color: spec.roof,
    });
    g.rect(ox + w * 0.46, oy - cellScale * 0.38, w * 0.08, cellScale * 0.28).fill({
      color: spec.accent,
    });
  } else {
    g.moveTo(ox, oy + h * 0.22)
      .lineTo(ox + w * 0.5, oy)
      .lineTo(ox + w, oy + h * 0.22)
      .closePath()
      .fill({ color: spec.roof });
  }

  g.rect(ox, oy + h * 0.2, w, h * 0.72).fill({ color: spec.wall });
  g.rect(ox + w * 0.42, oy + h * 0.55, w * 0.16, h * 0.37).fill({
    color: 0x1c1917,
  });
  g.rect(ox + w * 0.12, oy + h * 0.34, w * 0.18, h * 0.14).fill({
    color: spec.accent,
    alpha: 0.9,
  });
  g.rect(ox + w * 0.7, oy + h * 0.34, w * 0.18, h * 0.14).fill({
    color: spec.accent,
    alpha: 0.9,
  });
  g.rect(ox + w * 0.12, oy + h * 0.56, w * 0.18, h * 0.14).fill({
    color: 0xe2e8f0,
    alpha: 0.85,
  });
  g.rect(ox + w * 0.7, oy + h * 0.56, w * 0.18, h * 0.14).fill({
    color: 0xe2e8f0,
    alpha: 0.85,
  });
};

export function buildEducationCampusLayer(input: {
  palette: MultiversePalette;
  cellScale: number;
  worldToLocal: (wx: number, wy: number) => { x: number; y: number };
  zone: EducationCampusZone;
  bandRect?: WorldBounds;
  lightCount?: number;
  centerCount?: number;
}): Container {
  const root = new Container();
  const lightCount = input.lightCount ?? EDUCATION_STREET_LIGHT_COUNT;
  const centerCount = Math.min(
    input.centerCount ?? EDUCATION_CENTER_COUNT,
    EDUCATION_CENTER_SPECS.length
  );
  const band = input.bandRect ?? input.zone.rect;
  const { left, right, top, bottom } = computeBandPixelExtents({
    bandRect: band,
    worldToLocal: input.worldToLocal,
  });
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const strokeColor = cssColorToPixi(input.palette.stroke);

  const lawn = new Graphics({ roundPixels: true });
  lawn.rect(left, top, width, height);
  lawn.fill({ color: 0x4d7c4f, alpha: 0.72 });
  lawn.stroke({ width: 1.5, color: strokeColor, alpha: 0.4 });
  root.addChild(lawn);

  const walk = new Graphics({ roundPixels: true });
  const walkH = Math.max(10, height * 0.22);
  walk.rect(left, bottom - walkH, width, walkH);
  walk.fill({ color: 0x78716c, alpha: 0.88 });
  root.addChild(walk);

  const stripW = Math.max(52, input.cellScale * 1.55);
  const stripH = Math.max(16, input.cellScale * 0.48);
  const stripX = left + Math.max(8, input.cellScale * 0.2);
  const stripY = top + height * 0.42 - stripH / 2;
  const strip = new Graphics({ roundPixels: true });
  strip.roundRect(stripX, stripY, stripW, stripH, 3);
  strip.fill({ color: 0x1e293b, alpha: 0.94 });
  strip.stroke({ width: 1, color: 0xf8fafc, alpha: 0.5 });
  root.addChild(strip);

  const label = new Text({
    text: input.zone.streetLabel || EDUCATION_STREET_NAME,
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(9, Math.round(stripH * 0.52)),
      fontWeight: "700",
      fill: 0xf8fafc,
      align: "center",
    },
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(stripX + stripW / 2, stripY + stripH / 2);
  root.addChild(label);

  const anchors = buildEducationCenterAnchors({
    bandRect: band,
    zoneRect: input.zone.rect,
    centerCount,
  });
  for (let i = 0; i < anchors.length; i += 1) {
    const anchor = anchors[i];
    const spec = EDUCATION_CENTER_SPECS[i];
    if (anchor === undefined || spec === undefined) {
      continue;
    }
    const g = new Graphics({ roundPixels: true });
    drawEducationCenterBuilding({
      g,
      cellScale: input.cellScale,
      spec,
    });
    const local = input.worldToLocal(anchor.x, anchor.y);
    g.position.set(local.x, local.y);
    root.addChild(g);

    const plaque = new Text({
      text: spec.label,
      style: {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: Math.max(8, Math.round(input.cellScale * 0.28)),
        fontWeight: "600",
        fill: 0xf8fafc,
        align: "center",
      },
    });
    plaque.anchor.set(0.5, 0);
    plaque.position.set(local.x, local.y + input.cellScale * 0.12);
    root.addChild(plaque);

    if (i < lightCount) {
      const lightPos = educationLightWorldPosition({
        buildingX: anchor.x,
        buildingY: anchor.y,
      });
      const light = buildStreetLightPost({
        palette: input.palette,
        cellScale: input.cellScale,
        scale: 0.9,
      });
      const lightLocal = input.worldToLocal(lightPos.x, lightPos.y);
      light.position.set(lightLocal.x, lightLocal.y);
      root.addChild(light);
    }
  }

  return root;
}
