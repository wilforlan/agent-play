import { Container, Graphics } from "pixi.js";
import type { ParkingStreetContent, WorldBounds } from "@agent-play/sdk/browser";
import { buildCarSprite } from "./sprite-car.js";
import { drawFlowerCluster, drawHomeStructure } from "./structure-art.js";
import { buildTSignPost } from "./world-street-signs.js";
import type { MultiversePalette } from "./multiverse-engine.js";
import { PARKING_BAY_ANCHORS } from "./parking-street-proximity.js";

export const PARKING_CAR_DISPLAY_SCALE = 1.4;

const HOUSE_PALETTE = {
  wall: 0xf5e6d3,
  roof: 0x8b5e3c,
  door: 0x5c3d2e,
  window: 0x9ad4ff,
  trim: 0xffffff,
};

const HOUSE_WORLD_X = [3, 8, 13, 18] as const;

export const laneDashSegments = (input: {
  left: number;
  right: number;
  dashW: number;
  gap: number;
}): ReadonlyArray<{ x: number; w: number }> => {
  const segments: Array<{ x: number; w: number }> = [];
  let x = input.left;
  while (x < input.right) {
    const w = Math.min(input.dashW, input.right - x);
    if (w > 0) {
      segments.push({ x, w });
    }
    x += input.dashW + input.gap;
  }
  return segments;
};

export const computeBandPixelExtents = (input: {
  bandRect: WorldBounds;
  worldToLocal: (wx: number, wy: number) => { x: number; y: number };
}): { left: number; right: number; top: number; bottom: number } => {
  const tl = input.worldToLocal(input.bandRect.minX, input.bandRect.maxY);
  const br = input.worldToLocal(input.bandRect.maxX + 1, input.bandRect.minY);
  return { left: tl.x, right: br.x, top: tl.y, bottom: br.y };
};

export const fillLaneDashes = (input: {
  dash: Graphics;
  left: number;
  right: number;
  laneY: number;
  dashW: number;
  gap: number;
}): void => {
  for (const segment of laneDashSegments({
    left: input.left,
    right: input.right,
    dashW: input.dashW,
    gap: input.gap,
  })) {
    input.dash
      .rect(segment.x, input.laneY, segment.w, 3)
      .fill({ color: 0xfff3a0, alpha: 0.9 });
  }
};

export function buildParkingStreetLayer(input: {
  zoneRect: WorldBounds;
  bandRect?: WorldBounds;
  parkingStreet: ParkingStreetContent;
  palette: MultiversePalette;
  cellScale: number;
  worldToLocal: (wx: number, wy: number) => { x: number; y: number };
}): Container {
  const root = new Container();
  const { minX, maxX, minY, maxY } = input.zoneRect;
  const band = input.bandRect ?? input.zoneRect;
  const bandExtents = computeBandPixelExtents({
    bandRect: band,
    worldToLocal: input.worldToLocal,
  });
  const bandWidth = bandExtents.right - bandExtents.left;
  const bandHeight = bandExtents.bottom - bandExtents.top;

  const asphalt = new Graphics();
  asphalt
    .rect(bandExtents.left, bandExtents.top, bandWidth, bandHeight)
    .fill({
      color: 0x3b3f44,
    });
  root.addChild(asphalt);

  const laneY = bandExtents.top + bandHeight * 0.55;
  const dash = new Graphics();
  const dashW = Math.max(10, input.cellScale * 0.45);
  const gap = Math.max(14, input.cellScale * 0.65);
  fillLaneDashes({
    dash,
    left: bandExtents.left,
    right: bandExtents.right,
    laneY,
    dashW,
    gap,
  });
  root.addChild(dash);

  for (let i = 0; i < HOUSE_WORLD_X.length; i += 1) {
    const hx = HOUSE_WORLD_X[i];
    if (hx === undefined) {
      continue;
    }
    const houseLoc = input.worldToLocal(hx, maxY - 0.2);
    const houseG = new Graphics();
    drawHomeStructure(houseG, input.cellScale * 1.1, HOUSE_PALETTE);
    houseG.position.set(houseLoc.x, houseLoc.y);
    root.addChild(houseG);

    const flowerG = new Graphics();
    drawFlowerCluster(flowerG, input.cellScale * 0.35, i + 1);
    flowerG.position.set(
      houseLoc.x + input.cellScale * 0.9,
      houseLoc.y + input.cellScale * 0.2
    );
    root.addChild(flowerG);
  }

  for (const anchor of PARKING_BAY_ANCHORS) {
    const loc = input.worldToLocal(anchor.x, anchor.y);
    const bayOutline = new Graphics();
    bayOutline
      .rect(
        loc.x - input.cellScale * 1.5,
        loc.y - input.cellScale * 0.55,
        input.cellScale * 3,
        input.cellScale * 1.1
      )
      .stroke({ color: 0xfff3a0, width: 1.2, alpha: 0.85 });
    root.addChild(bayOutline);
  }

  for (const spot of input.parkingStreet.spots) {
    const occupant = spot.occupant;
    if (occupant === null) {
      continue;
    }
    const anchor = PARKING_BAY_ANCHORS.find(
      (a) => a.bay === spot.bay && a.layer === spot.layer
    );
    if (anchor === undefined) {
      continue;
    }
    const loc = input.worldToLocal(anchor.x, anchor.y);
    const car = buildCarSprite({
      colorHex: occupant.colorHex,
      model: occupant.model,
      sold: false,
      scale: PARKING_CAR_DISPLAY_SCALE,
    });
    car.position.set(loc.x, loc.y);
    root.addChild(car);

    const sign = buildTSignPost({
      palette: input.palette,
      cellScale: input.cellScale,
      label: occupant.displayNick,
    });
    sign.position.set(loc.x, loc.y + input.cellScale * 0.75);
    root.addChild(sign);
  }

  return root;
};
