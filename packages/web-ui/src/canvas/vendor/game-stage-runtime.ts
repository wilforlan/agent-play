/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-stage-runtime
 *
 * Viewport fitting and player spawn helpers for arcade game stages.
 */

import { Container, Graphics, Text } from "pixi.js";
import type { GameStageBounds, GameStageHandle } from "./game-stage-base.js";
import { GAME_STAGE_BOUNDS } from "./game-stage-base.js";

export const GAME_STAGE_HEADER_BAND_PX = 56;

export const computeGameStageLayout = (input: {
  viewport: { width: number; height: number };
  bounds: GameStageBounds;
}): { cellScale: number; offsetX: number; offsetY: number } => {
  const boundsW = Math.max(1, input.bounds.maxX - input.bounds.minX);
  const boundsH = Math.max(1, input.bounds.maxY - input.bounds.minY);
  const availableHeight = Math.max(
    60,
    input.viewport.height - GAME_STAGE_HEADER_BAND_PX
  );
  const cellScale = Math.max(
    16,
    Math.min(input.viewport.width / boundsW, availableHeight / boundsH)
  );
  const stageW = boundsW * cellScale;
  const stageH = boundsH * cellScale;
  const offsetX = (input.viewport.width - stageW) / 2;
  const offsetY =
    GAME_STAGE_HEADER_BAND_PX + (availableHeight - stageH) / 2;
  return { cellScale, offsetX, offsetY };
};

export const gameStageSpawnPosition = (
  bounds: GameStageBounds
): { x: number; y: number } => ({
  x: (bounds.minX + bounds.maxX) / 2,
  y: bounds.maxY - 1,
});

export type WrappedGameStage = {
  handle: GameStageHandle;
  cellScale: number;
  offsetX: number;
  offsetY: number;
  playerLayer: Container;
};

export const wrapGameStageForViewport = (input: {
  handle: GameStageHandle;
  title: string;
  viewport: { width: number; height: number };
  bounds?: GameStageBounds;
}): WrappedGameStage => {
  const bounds = input.bounds ?? GAME_STAGE_BOUNDS;
  const { cellScale, offsetX, offsetY } = computeGameStageLayout({
    viewport: input.viewport,
    bounds,
  });
  const gameRoot = input.handle.root as Container;
  const viewportRoot = new Container();

  const ground = new Graphics();
  ground
    .rect(0, 0, input.viewport.width, input.viewport.height)
    .fill({ color: 0x0f172a });
  viewportRoot.addChild(ground);

  const headerBand = new Graphics();
  headerBand
    .rect(0, 0, input.viewport.width, GAME_STAGE_HEADER_BAND_PX)
    .fill({ color: 0x111827 });
  headerBand
    .rect(0, GAME_STAGE_HEADER_BAND_PX - 2, input.viewport.width, 2)
    .fill({ color: 0x374151, alpha: 0.7 });
  viewportRoot.addChild(headerBand);

  const headline = new Text({
    text: input.title,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 16,
      fontWeight: "800",
      fill: 0xf8fafc,
      letterSpacing: 1.5,
    },
  });
  headline.anchor.set(0.5, 0.5);
  headline.position.set(input.viewport.width / 2, GAME_STAGE_HEADER_BAND_PX / 2);
  viewportRoot.addChild(headline);

  const interior = new Container();
  interior.position.set(offsetX, offsetY);
  viewportRoot.addChild(interior);

  while (gameRoot.children.length > 0) {
    const child = gameRoot.children[0];
    if (child !== undefined) {
      interior.addChild(child);
    }
  }

  const playerLayer = new Container();
  interior.addChild(playerLayer);

  const wrappedHandle: GameStageHandle = {
    ...input.handle,
    root: viewportRoot,
    attach: () => {
      input.handle.attach();
    },
    detach: () => {
      input.handle.detach();
    },
    destroy: () => {
      input.handle.detach();
      viewportRoot.destroy({ children: true });
    },
  };

  return {
    handle: wrappedHandle,
    cellScale,
    offsetX,
    offsetY,
    playerLayer,
  };
};
