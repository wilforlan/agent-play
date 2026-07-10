/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-price-check-stage
 *
 * Price Check arcade stage — guess higher or lower across three rounds.
 */

import { Container, Text } from "pixi.js";
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

const PRICE_SEQUENCE = [12, 8, 15] as const;
const DIRECTION_SEQUENCE: ReadonlyArray<"higher" | "lower"> = [
  "lower",
  "higher",
  "lower",
];
const ROUND_COUNT = 3;

/**
 * Build the Price Check arcade stage.
 *
 * @public
 */
export const buildGamePriceCheckStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "PRICE TAG", cellScale: options.cellScale })
  );

  const uiLayer = new Container();
  root.addChild(uiLayer);

  const priceLabel = new Text({
    text: "$0.00",
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(22, Math.round(options.cellScale * 0.75)),
      fontWeight: "800",
      fill: 0xfef3c7,
    },
  });
  priceLabel.anchor.set(0.5);
  priceLabel.position.set(
    (GAME_STAGE_BOUNDS.maxX * options.cellScale) / 2,
    GAME_STAGE_BOUNDS.maxY * options.cellScale * 0.42
  );
  uiLayer.addChild(priceLabel);

  const events: GameEvent[] = [];
  let round = 0;
  let roundComplete = false;

  const refreshPrice = (): void => {
    const price = PRICE_SEQUENCE[round] ?? PRICE_SEQUENCE[0];
    priceLabel.text = `$${price.toFixed(2)}`;
  };

  const tryFinish = (): void => {
    if (round < ROUND_COUNT || roundComplete) return;
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const onGuess = (direction: "higher" | "lower"): void => {
    if (roundComplete || round >= ROUND_COUNT) return;
    const expected = DIRECTION_SEQUENCE[round] ?? "lower";
    const correct = direction === expected;
    events.push({
      type: "price_guess",
      correct,
      round: round + 1,
    });
    round += 1;
    if (round < ROUND_COUNT) {
      refreshPrice();
    }
    tryFinish();
  };

  refreshPrice();

  const btnY = 4.2;
  const higher = buildGameTapButton({
    label: "Higher",
    x: 1.5,
    y: btnY,
    widthCells: 3,
    heightCells: 1.1,
    cellScale: options.cellScale,
    fill: 0x047857,
    onTap: () => onGuess("higher"),
  });
  const lower = buildGameTapButton({
    label: "Lower",
    x: 5.5,
    y: btnY,
    widthCells: 3,
    heightCells: 1.1,
    cellScale: options.cellScale,
    fill: 0xb45309,
    onTap: () => onGuess("lower"),
  });
  uiLayer.addChild(higher);
  uiLayer.addChild(lower);

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });
  const exitTarget = buildGameStageExitProximityTarget(exitDoorAnchor);
  const higherTarget = buildGameTapButtonProximityTarget({
    id: "higher",
    label: "Higher",
    verb: "Guess",
    x: 1.5,
    y: btnY,
    widthCells: 3,
    heightCells: 1.1,
  });
  const lowerTarget = buildGameTapButtonProximityTarget({
    id: "lower",
    label: "Lower",
    verb: "Guess",
    x: 5.5,
    y: btnY,
    widthCells: 3,
    heightCells: 1.1,
  });

  return {
    id: "gamePriceCheck",
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
      roundComplete ? [exitTarget] : [higherTarget, lowerTarget, exitTarget],
    activateProximityTarget: (id) => {
      if (id === GAME_STAGE_EXIT_TARGET_ID) return false;
      if (id === "higher") {
        onGuess("higher");
        return true;
      }
      if (id === "lower") {
        onGuess("lower");
        return true;
      }
      return false;
    },
  };
};
