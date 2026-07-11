import { Container, Graphics, Text } from "pixi.js";
import type { HouseSlot } from "@agent-play/sdk/browser";
import {
  buildHouseOwnershipPanelLines,
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
  readonly showOwnershipPanel: boolean;
  readonly ownerDisplayName: string | null;
  readonly priceUsd: number;
  readonly layoutLabel: string;
  readonly purchaseAnchor: { x: number; y: number } | null;
  readonly ownershipPanelLines: readonly string[];
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

const mountOwnershipPanel = (input: {
  root: Container;
  cellScale: number;
  bounds: AmenityStageBounds;
  lines: readonly string[];
}): void => {
  if (input.lines.length === 0) {
    return;
  }
  const panelWidth = input.cellScale * 4.8;
  const panelHeight = input.cellScale * (1.2 + input.lines.length * 0.42);
  const panelX =
    (input.bounds.minX + input.bounds.maxX) * 0.5 * input.cellScale -
    panelWidth * 0.5;
  const panelY = input.bounds.minY * input.cellScale + input.cellScale * 0.55;
  const plaque = new Graphics();
  plaque
    .roundRect(panelX, panelY, panelWidth, panelHeight, 10)
    .fill({ color: 0xf8fafc, alpha: 0.96 });
  plaque
    .roundRect(panelX, panelY, panelWidth, panelHeight, 10)
    .stroke({ color: 0x1e3a5f, width: 2, alpha: 0.85 });
  input.root.addChild(plaque);

  const fontSize = Math.max(11, Math.round(input.cellScale * 0.28));
  const lineHeight = fontSize * 1.35;
  input.lines.forEach((line, index) => {
    const text = new Text({
      text: line,
      style: {
        fontFamily: "system-ui, sans-serif",
        fontSize: index === 0 ? fontSize + 1 : fontSize,
        fontWeight: index === 0 ? "800" : "600",
        fill: index === 0 ? 0x1e3a5f : 0x334155,
      },
    });
    text.position.set(panelX + input.cellScale * 0.35, panelY + input.cellScale * 0.35 + index * lineHeight);
    input.root.addChild(text);
  });
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
  const ownershipPanelLines = buildHouseOwnershipPanelLines(input.house);
  const showOwnershipPanel = owned && ownershipPanelLines.length > 0;
  const showPurchasePanel =
    input.mode === "inspect" && !owned;
  const purchaseAnchor = showPurchasePanel
    ? { x: blueprint.bounds.maxX * 0.55, y: blueprint.bounds.maxY - 1.2 }
    : null;

  if (showOwnershipPanel) {
    mountOwnershipPanel({
      root,
      cellScale: input.cellScale,
      bounds: blueprint.bounds,
      lines: ownershipPanelLines,
    });
  }

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
    showOwnershipPanel,
    ownerDisplayName: input.house.ownerDisplayName,
    priceUsd: input.house.priceUsd,
    layoutLabel: blueprint.label,
    purchaseAnchor,
    ownershipPanelLines,
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
