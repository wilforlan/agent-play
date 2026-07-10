/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-lease-locker-stage
 *
 * Lease Locker arcade stage — pick the correct amenity door.
 */

import { Container } from "pixi.js";
import type { GameEvent } from "@agent-play/sdk/browser";
import {
  buildGameStageBackdrop,
  buildGameStageTitle,
  buildGameTapButton,
  clampToBounds,
  finishGameRound,
  GAME_STAGE_BOUNDS,
  mountExitDoor,
  type BuildGameStageOptions,
  type GameStageHandle,
} from "./game-stage-base.js";

const DOORS = [
  { label: "Shop", correct: false, fill: 0xb45309 },
  { label: "Market", correct: true, fill: 0x047857 },
  { label: "Car Wash", correct: false, fill: 0x1e3a5f },
] as const;

/**
 * Build the Lease Locker arcade stage.
 *
 * @public
 */
export const buildGameLeaseLockerStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "LOCKER HALL", cellScale: options.cellScale })
  );

  const uiLayer = new Container();
  root.addChild(uiLayer);

  const events: GameEvent[] = [];
  let roundComplete = false;

  const onPick = (correct: boolean): void => {
    if (roundComplete) return;
    events.push({ type: "door_pick", correct });
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const startX = 1.4;
  const rowY = 3;
  const spacing = 2.8;
  for (let i = 0; i < DOORS.length; i += 1) {
    const door = DOORS[i];
    if (door === undefined) continue;
    const btn = buildGameTapButton({
      label: door.label,
      x: startX + i * spacing,
      y: rowY,
      widthCells: 2.2,
      heightCells: 1.4,
      cellScale: options.cellScale,
      fill: door.fill,
      onTap: () => onPick(door.correct),
    });
    uiLayer.addChild(btn);
  }

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });

  return {
    id: "gameLeaseLocker",
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
