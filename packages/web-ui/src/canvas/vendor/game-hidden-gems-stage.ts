/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-hidden-gems-stage
 *
 * Hidden Gems arcade stage — six chest slots the player opens in order.
 */

import { Container, Graphics } from "pixi.js";
import type { GameEvent } from "@agent-play/sdk/browser";
import {
  buildGameStageBackdrop,
  buildGameStageTitle,
  clampToBounds,
  finishGameRound,
  GAME_STAGE_BOUNDS,
  mountExitDoor,
  type BuildGameStageOptions,
  type GameStageHandle,
} from "./game-stage-base.js";

const CHEST_COUNT = 6;
const CHEST_CORRECT_PATTERN = [true, true, false, true, false, true];

const buildChestSprite = (input: {
  cellScale: number;
  opened: boolean;
  onTap: () => void;
}): Container => {
  const size = input.cellScale * 0.9;
  const chest = new Container();
  const g = new Graphics();
  const color = input.opened ? 0x475569 : 0xb45309;
  g.roundRect(0, 0, size, size * 0.85, 6).fill({ color });
  g.roundRect(size * 0.15, size * 0.35, size * 0.7, size * 0.12, 2).fill({
    color: 0xfde68a,
    alpha: input.opened ? 0.9 : 0.5,
  });
  chest.addChild(g);
  if (!input.opened) {
    chest.eventMode = "static";
    chest.cursor = "pointer";
    chest.on("pointertap", input.onTap);
  }
  return chest;
};

/**
 * Build the Hidden Gems arcade stage.
 *
 * @public
 */
export const buildGameHiddenGemsStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(buildGameStageTitle({ title: "GEM CHEST", cellScale: options.cellScale }));

  const chestLayer = new Container();
  root.addChild(chestLayer);

  const events: GameEvent[] = [];
  let openedCount = 0;
  let roundComplete = false;
  const chestNodes: Container[] = [];

  const tryFinish = (): void => {
    if (openedCount < CHEST_COUNT || roundComplete) return;
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const openChest = (index: number): void => {
    if (roundComplete || index !== openedCount) return;
    const correct = CHEST_CORRECT_PATTERN[index] ?? false;
    const tutorial = options.tutorial === true && index === 0;
    events.push({ type: "chest_open", correct, tutorial });
    openedCount += 1;
    const node = chestNodes[index];
    if (node !== undefined) {
      chestLayer.removeChild(node);
      const opened = buildChestSprite({
        cellScale: options.cellScale,
        opened: true,
        onTap: () => {},
      });
      opened.position.copyFrom(node.position);
      chestLayer.addChild(opened);
      chestNodes[index] = opened;
    }
    tryFinish();
  };

  const spacing = 1.4;
  const startX =
    (GAME_STAGE_BOUNDS.maxX - (CHEST_COUNT - 1) * spacing) / 2;
  const rowY = GAME_STAGE_BOUNDS.maxY * 0.55;

  for (let i = 0; i < CHEST_COUNT; i += 1) {
    const chest = buildChestSprite({
      cellScale: options.cellScale,
      opened: false,
      onTap: () => openChest(i),
    });
    chest.position.set(
      (startX + i * spacing) * options.cellScale,
      rowY * options.cellScale
    );
    chestLayer.addChild(chest);
    chestNodes.push(chest);
  }

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });

  return {
    id: "gameHiddenGems",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    completeRound: () => ({ events: [...events] }),
    clampPosition: (pos) => clampToBounds(pos, GAME_STAGE_BOUNDS),
    exitDoorAnchor,
  };
};
