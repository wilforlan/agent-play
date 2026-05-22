/**
 * @packageDocumentation
 * @module @agent-play/play-ui/amenity-carwash-stage
 *
 * The "car wash" amenity stage — an asphalt forecourt with a 3×3 numbered
 * parking grid. Each filled slot hosts a {@link buildCarSprite}; empty
 * slots show as faint outlines so the lot retains its 9-slot footprint.
 *
 * @see ./sprite-car.ts — per-slot car renderer.
 * @see ./amenity-stage-base.ts — shared helpers (bounds, proximity, door).
 */

import { Container, Graphics, Text } from "pixi.js";
import { buildCarSprite } from "./sprite-car.js";
import {
  clampToBounds,
  findNearestSlot,
  mountExitDoor,
  type AmenityStageBounds,
} from "./amenity-stage-base.js";
import type { StageHandle } from "./stage-controller.js";

/**
 * Walkable bounds for the car-wash lot.
 *
 * @public
 */
export const CAR_WASH_BOUNDS: AmenityStageBounds = {
  minX: 0,
  minY: 0,
  maxX: 12,
  maxY: 9,
};

export const CAR_WASH_SLOT_COUNT = 9;

/**
 * Snapshot of a single car parked in the lot.
 *
 * @public
 */
export type CarWashCarSnapshot = {
  readonly id: string;
  readonly slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  readonly name: string;
  readonly model: string;
  readonly year: number;
  readonly priceUsd: number;
  readonly colorHex: string;
  readonly sale: { status: "available" | "sold"; soldToPlayerId?: string };
};

/**
 * Layout position for a single car-wash slot.
 *
 * @public
 */
export type CarWashSlot = {
  readonly id: string;
  readonly slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  readonly x: number;
  readonly y: number;
  readonly car: CarWashCarSnapshot | null;
};

const SLOT_COLS = 3;
const SLOT_OFFSET_X = 2;
const SLOT_OFFSET_Y = 2;
const SLOT_SPACING_X = 3.6;
const SLOT_SPACING_Y = 2.4;

/**
 * Lay out the 9-slot grid. Filled positions reference the car; empty
 * positions return `car: null`.
 *
 * @public
 */
export const layoutCarWashSlots = (
  cars: ReadonlyArray<CarWashCarSnapshot>
): CarWashSlot[] => {
  const bySlot = new Map<number, CarWashCarSnapshot>();
  for (const car of cars) {
    bySlot.set(car.slot, car);
  }
  const slots: CarWashSlot[] = [];
  for (let n = 1; n <= CAR_WASH_SLOT_COUNT; n += 1) {
    const col = (n - 1) % SLOT_COLS;
    const row = Math.floor((n - 1) / SLOT_COLS);
    const car = bySlot.get(n) ?? null;
    slots.push({
      id: car?.id ?? `__empty_${n}`,
      slot: n as CarWashSlot["slot"],
      x: SLOT_OFFSET_X + col * SLOT_SPACING_X,
      y: SLOT_OFFSET_Y + row * SLOT_SPACING_Y,
      car,
    });
  }
  return slots;
};

/**
 * Player spawn inside the car-wash, away from the exit door at (0, 0).
 *
 * @public
 */
export const carWashSpawnPosition = (): { x: number; y: number } => ({
  x: CAR_WASH_BOUNDS.maxX / 2,
  y: CAR_WASH_BOUNDS.maxY - 0.8,
});

const buildCarWashBackdrop = (cellScale: number): Container => {
  const root = new Container();
  const width = CAR_WASH_BOUNDS.maxX * cellScale;
  const height = CAR_WASH_BOUNDS.maxY * cellScale;
  const asphalt = new Graphics();
  asphalt.rect(0, 0, width, height).fill({ color: 0x3b3f44 });
  for (let i = cellScale; i < width; i += cellScale * 1.2) {
    asphalt.rect(i, height - 24, cellScale * 0.6, 4).fill({
      color: 0xfff3a0,
      alpha: 0.8,
    });
  }
  root.addChild(asphalt);
  return root;
};

const buildSlotStripes = (cellScale: number): Container => {
  const root = new Container();
  for (let n = 1; n <= CAR_WASH_SLOT_COUNT; n += 1) {
    const col = (n - 1) % SLOT_COLS;
    const row = Math.floor((n - 1) / SLOT_COLS);
    const x = (SLOT_OFFSET_X + col * SLOT_SPACING_X) * cellScale;
    const y = (SLOT_OFFSET_Y + row * SLOT_SPACING_Y) * cellScale;
    const slot = new Graphics();
    slot
      .rect(x - cellScale * 1.4, y - cellScale * 0.6, cellScale * 2.8, cellScale * 1.2)
      .stroke({ color: 0xfff3a0, width: 1.2, alpha: 0.85 });
    root.addChild(slot);

    const number = new Text({
      text: `${n}`,
      style: {
        fontFamily: "system-ui, sans-serif",
        fontSize: Math.max(11, Math.round(cellScale * 0.4)),
        fontWeight: "800",
        fill: 0xfff3a0,
      },
    });
    number.alpha = 0.85;
    number.anchor.set(0, 1);
    number.position.set(x - cellScale * 1.3, y - cellScale * 0.65);
    root.addChild(number);
  }
  return root;
};

/**
 * Handle returned by {@link buildAmenityCarWashStage}.
 *
 * @public
 */
export type AmenityCarWashStageHandle = StageHandle & {
  refresh(cars: ReadonlyArray<CarWashCarSnapshot>): void;
  getSlots(): ReadonlyArray<CarWashSlot>;
  findNearbyCar(playerWorld: {
    x: number;
    y: number;
  }): CarWashSlot | null;
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
};

/**
 * Build the car-wash stage.
 *
 * @public
 */
export const buildAmenityCarWashStage = (input: {
  cellScale: number;
  cars: ReadonlyArray<CarWashCarSnapshot>;
}): AmenityCarWashStageHandle => {
  const root = new Container();
  root.addChild(buildCarWashBackdrop(input.cellScale));
  root.addChild(buildSlotStripes(input.cellScale));

  const carsLayer = new Container();
  root.addChild(carsLayer);

  let slots: CarWashSlot[] = [];

  const refresh = (next: ReadonlyArray<CarWashCarSnapshot>): void => {
    carsLayer.removeChildren();
    slots = layoutCarWashSlots(next);
    for (const slot of slots) {
      if (slot.car === null) continue;
      const sprite = buildCarSprite({
        colorHex: slot.car.colorHex,
        model: slot.car.model,
        sold: slot.car.sale.status === "sold",
      });
      sprite.position.set(
        slot.x * input.cellScale,
        slot.y * input.cellScale
      );
      carsLayer.addChild(sprite);
    }
  };

  refresh(input.cars);
  const exitDoorAnchor = mountExitDoor({ root, cellScale: input.cellScale });

  return {
    id: "amenityCarWash",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    refresh,
    getSlots: () => slots,
    findNearbyCar: (playerWorld) => {
      const filled = slots.filter(
        (slot): slot is CarWashSlot & { car: CarWashCarSnapshot } =>
          slot.car !== null
      );
      return findNearestSlot(filled, playerWorld, 2.2);
    },
    clampPosition: (pos) => clampToBounds(pos, CAR_WASH_BOUNDS),
    exitDoorAnchor,
  };
};
