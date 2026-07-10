/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-signal-hunt-stage
 *
 * Signal Hunt arcade stage — pick the correct signal among four choices.
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
import {
  buildGameStageExitProximityTarget,
  buildGameTapButtonProximityTarget,
  GAME_STAGE_EXIT_TARGET_ID,
} from "./game-stage-proximity.js";

const CHOICES = ["Alpha", "Bravo", "Charlie", "Delta"] as const;
const CORRECT_CHOICE = "Bravo";

/**
 * Build the Signal Hunt arcade stage.
 *
 * @public
 */
export const buildGameSignalHuntStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "SIGNAL TOWER", cellScale: options.cellScale })
  );

  const uiLayer = new Container();
  root.addChild(uiLayer);

  const events: GameEvent[] = [];
  let roundComplete = false;

  const onPick = (choice: string): void => {
    if (roundComplete) return;
    const correct = choice === CORRECT_CHOICE;
    events.push({ type: "signal_pick", correct });
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const startX = 1;
  const rowY = 2.8;
  const colW = 2.1;
  const rowH = 1.1;
  for (let i = 0; i < CHOICES.length; i += 1) {
    const label = CHOICES[i] ?? "";
    const col = i % 2;
    const row = Math.floor(i / 2);
    const btn = buildGameTapButton({
      label,
      x: startX + col * 4.2,
      y: rowY + row * 1.5,
      widthCells: colW,
      heightCells: rowH,
      cellScale: options.cellScale,
      fill: 0x312e81,
      onTap: () => onPick(label),
    });
    uiLayer.addChild(btn);
  }

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });
  const exitTarget = buildGameStageExitProximityTarget(exitDoorAnchor);
  const choiceTargets = CHOICES.map((label, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return buildGameTapButtonProximityTarget({
      id: `signal-${label}`,
      label,
      verb: "Pick",
      x: startX + col * 4.2,
      y: rowY + row * 1.5,
      widthCells: colW,
      heightCells: rowH,
    });
  });

  return {
    id: "gameSignalHunt",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    completeRound: () => ({ events: [...events] }),
    clampPosition: (pos) => clampToBounds(pos, GAME_STAGE_BOUNDS),
    exitDoorAnchor,
    listProximityTargets: () =>
      roundComplete ? [exitTarget] : [...choiceTargets, exitTarget],
    activateProximityTarget: (id) => {
      if (id === GAME_STAGE_EXIT_TARGET_ID) return false;
      const label = id.startsWith("signal-") ? id.slice("signal-".length) : null;
      if (label === null) return false;
      onPick(label);
      return true;
    },
  };
};
