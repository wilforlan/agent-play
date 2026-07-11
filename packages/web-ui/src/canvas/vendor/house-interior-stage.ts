import { Container, Graphics, Text } from "pixi.js";
import type { HouseSlot } from "@agent-play/sdk/browser";
import {
  clampHousePosition,
  getHouseBlueprint,
  houseSpawnPosition,
  layoutHouseFixtures,
} from "@agent-play/sdk/browser";
import {
  clampToBounds,
  mountExitDoor,
  type AmenityStageBounds,
} from "./house-stage-base.js";
import { buildHouseFixtureGraphic } from "./sprite-house-fixtures.js";
import type { StageHandle } from "./stage-controller.js";

export type HouseStageMode = "owner" | "inspect";

export type HouseInteriorStageHandle = StageHandle & {
  readonly mode: HouseStageMode;
  readonly houseId: HouseSlot["houseId"];
  readonly showPurchasePanel: boolean;
  readonly ownerDisplayName: string | null;
  readonly priceUsd: number;
  readonly layoutLabel: string;
  readonly purchaseAnchor: { x: number; y: number } | null;
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
  spawnPosition(): { x: number; y: number };
};

const buildHouseFloor = (input: {
  bounds: AmenityStageBounds;
  cellScale: number;
  color: number;
  pattern: "planks" | "tiles" | "carpet";
}): Graphics => {
  const floor = new Graphics();
  const width = (input.bounds.maxX - input.bounds.minX) * input.cellScale;
  const height = (input.bounds.maxY - input.bounds.minY) * input.cellScale;
  floor.rect(0, 0, width, height).fill({ color: input.color });
  const step =
    input.pattern === "tiles"
      ? input.cellScale * 0.8
      : input.cellScale * 0.5;
  for (let x = 0; x < width; x += step) {
    floor.moveTo(x, 0).lineTo(x, height).stroke({
      color: 0x000000,
      width: 0.5,
      alpha: input.pattern === "carpet" ? 0.08 : 0.15,
    });
  }
  for (let y = 0; y < height; y += step) {
    floor.moveTo(0, y).lineTo(width, y).stroke({
      color: 0x000000,
      width: 0.5,
      alpha: input.pattern === "carpet" ? 0.08 : 0.15,
    });
  }
  return floor;
};

export const buildHouseInteriorStage = (input: {
  cellScale: number;
  house: HouseSlot;
  mode: HouseStageMode;
}): HouseInteriorStageHandle => {
  const blueprint = getHouseBlueprint(input.house.layoutId);
  const root = new Container();
  root.addChild(
    buildHouseFloor({
      bounds: blueprint.bounds,
      cellScale: input.cellScale,
      color: blueprint.floor.color,
      pattern: blueprint.floor.pattern,
    })
  );

  const fixturesLayer = new Container();
  root.addChild(fixturesLayer);
  for (const slot of layoutHouseFixtures(blueprint)) {
    const graphic = buildHouseFixtureGraphic({
      kind: slot.kind,
      variant: slot.variant,
      cellScale: input.cellScale,
    });
    graphic.position.set(slot.x * input.cellScale, slot.y * input.cellScale);
    fixturesLayer.addChild(graphic);
  }

  const label = new Text({
    text: `House ${String(input.house.houseId)} · ${blueprint.label}`,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(12, Math.round(input.cellScale * 0.35)),
      fontWeight: "700",
      fill: 0x1f2937,
    },
  });
  label.position.set(input.cellScale * 0.4, input.cellScale * 0.2);
  root.addChild(label);

  const owned = input.house.ownerNodeId !== null;
  const showPurchasePanel =
    input.mode === "inspect" && !owned;
  const purchaseAnchor = showPurchasePanel
    ? { x: blueprint.bounds.maxX * 0.55, y: blueprint.bounds.maxY - 1.2 }
    : null;

  if (purchaseAnchor !== null) {
    const panelMarker = new Graphics();
    panelMarker
      .roundRect(
        purchaseAnchor.x * input.cellScale - input.cellScale * 1.1,
        purchaseAnchor.y * input.cellScale - input.cellScale * 0.8,
        input.cellScale * 2.2,
        input.cellScale * 1.4,
        6
      )
      .fill({ color: 0x1e3a5f, alpha: 0.25 });
    root.addChild(panelMarker);
  }

  const exitDoorAnchor = mountExitDoor({ root, cellScale: input.cellScale });

  return {
    id: "houseInterior",
    root,
    mode: input.mode,
    houseId: input.house.houseId,
    showPurchasePanel,
    ownerDisplayName: input.house.ownerDisplayName,
    priceUsd: input.house.priceUsd,
    layoutLabel: blueprint.label,
    purchaseAnchor,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    clampPosition: (pos) =>
      clampHousePosition(blueprint, clampToBounds(pos, blueprint.bounds)),
    exitDoorAnchor,
    spawnPosition: () => houseSpawnPosition(blueprint),
  };
};
