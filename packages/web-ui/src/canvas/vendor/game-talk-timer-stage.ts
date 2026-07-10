/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-talk-timer-stage
 *
 * Talk Timer arcade stage — hold Space and release inside the target zone.
 */

import { Container, Graphics, Text } from "pixi.js";
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

const TARGET_MIN = 0.42;
const TARGET_MAX = 0.58;
const FILL_SPEED = 0.55;

/**
 * Build the Talk Timer arcade stage.
 *
 * @public
 */
export const buildGameTalkTimerStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "COMMS BOOTH", cellScale: options.cellScale })
  );

  const uiLayer = new Container();
  root.addChild(uiLayer);

  const barWidth = GAME_STAGE_BOUNDS.maxX * options.cellScale * 0.7;
  const barHeight = options.cellScale * 0.45;
  const barX = (GAME_STAGE_BOUNDS.maxX * options.cellScale - barWidth) / 2;
  const barY = GAME_STAGE_BOUNDS.maxY * options.cellScale * 0.48;

  const track = new Graphics();
  track.roundRect(0, 0, barWidth, barHeight, 8).fill({ color: 0x1e293b });
  track.roundRect(
    barWidth * TARGET_MIN,
    0,
    barWidth * (TARGET_MAX - TARGET_MIN),
    barHeight,
    4
  ).fill({ color: 0x047857, alpha: 0.45 });
  track.position.set(barX, barY);
  uiLayer.addChild(track);

  const fill = new Graphics();
  fill.position.set(barX, barY);
  uiLayer.addChild(fill);

  const hint = new Text({
    text: "Hold Space, release in green",
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(12, Math.round(options.cellScale * 0.36)),
      fill: 0x94a3b8,
    },
  });
  hint.anchor.set(0.5);
  hint.position.set(
    (GAME_STAGE_BOUNDS.maxX * options.cellScale) / 2,
    barY + barHeight + options.cellScale * 0.55
  );
  uiLayer.addChild(hint);

  const events: GameEvent[] = [];
  let holding = false;
  let level = 0;
  let round = 1;
  let roundComplete = false;
  let rafId: number | null = null;
  let lastTs: number | null = null;
  let keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  let keyUpHandler: ((event: KeyboardEvent) => void) | null = null;

  const redrawFill = (): void => {
    fill.clear();
    fill.roundRect(0, 0, barWidth * level, barHeight, 8).fill({
      color: 0x38bdf8,
      alpha: 0.9,
    });
  };

  const stopLoop = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTs = null;
  };

  const tick = (ts: number): void => {
    if (!holding || roundComplete) {
      stopLoop();
      return;
    }
    if (lastTs !== null) {
      const deltaSec = (ts - lastTs) / 1000;
      level = Math.min(1, level + deltaSec * FILL_SPEED);
      redrawFill();
    }
    lastTs = ts;
    rafId = requestAnimationFrame(tick);
  };

  const release = (): void => {
    if (roundComplete || !holding) return;
    holding = false;
    stopLoop();
    const success = level >= TARGET_MIN && level <= TARGET_MAX;
    events.push({ type: "talk_release", success, round });
    if (round < 3 && !success) {
      round += 1;
      level = 0;
      redrawFill();
      return;
    }
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });

  return {
    id: "gameTalkTimer",
    root,
    attach: () => {
      keyDownHandler = (event: KeyboardEvent) => {
        if (event.code !== "Space" || roundComplete) return;
        event.preventDefault();
        if (holding) return;
        holding = true;
        rafId = requestAnimationFrame(tick);
      };
      keyUpHandler = (event: KeyboardEvent) => {
        if (event.code !== "Space") return;
        event.preventDefault();
        release();
      };
      window.addEventListener("keydown", keyDownHandler);
      window.addEventListener("keyup", keyUpHandler);
    },
    detach: () => {
      stopLoop();
      if (keyDownHandler !== null) {
        window.removeEventListener("keydown", keyDownHandler);
        keyDownHandler = null;
      }
      if (keyUpHandler !== null) {
        window.removeEventListener("keyup", keyUpHandler);
        keyUpHandler = null;
      }
      holding = false;
    },
    destroy: () => {
      stopLoop();
      if (keyDownHandler !== null) {
        window.removeEventListener("keydown", keyDownHandler);
      }
      if (keyUpHandler !== null) {
        window.removeEventListener("keyup", keyUpHandler);
      }
      root.destroy({ children: true });
    },
    completeRound: () => ({ events: [...events] }),
    clampPosition: (pos) => clampToBounds(pos, GAME_STAGE_BOUNDS),
    exitDoorAnchor,
  };
};
