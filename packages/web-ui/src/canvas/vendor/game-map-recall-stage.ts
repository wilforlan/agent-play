/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-map-recall-stage
 *
 * Map Recall arcade stage — tap three structure buttons in sequence.
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

const SEQUENCE = ["Library", "Market", "Garage"] as const;
const BUTTON_LABELS = ["Library", "Market", "Garage"] as const;

/**
 * Build the Map Recall arcade stage.
 *
 * @public
 */
export const buildGameMapRecallStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "MAP ROOM", cellScale: options.cellScale })
  );

  const uiLayer = new Container();
  root.addChild(uiLayer);

  const events: GameEvent[] = [];
  let stepIndex = 0;
  let roundComplete = false;

  const tryFinish = (): void => {
    if (stepIndex < SEQUENCE.length || roundComplete) return;
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const onPick = (label: string): void => {
    if (roundComplete) return;
    const expected = SEQUENCE[stepIndex];
    const correct = expected === label;
    const tutorial = options.tutorial === true && stepIndex === 0;
    events.push({ type: "sequence_step", correct, tutorial });
    if (correct) {
      stepIndex += 1;
    }
    tryFinish();
  };

  const startX = 1.2;
  const rowY = 3.2;
  const spacing = 2.8;
  for (let i = 0; i < BUTTON_LABELS.length; i += 1) {
    const label = BUTTON_LABELS[i] ?? "";
    const btn = buildGameTapButton({
      label,
      x: startX + i * spacing,
      y: rowY,
      widthCells: 2.2,
      heightCells: 1.1,
      cellScale: options.cellScale,
      fill: 0x1e3a5f,
      onTap: () => onPick(label),
    });
    uiLayer.addChild(btn);
  }

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });

  return {
    id: "gameMapRecall",
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
