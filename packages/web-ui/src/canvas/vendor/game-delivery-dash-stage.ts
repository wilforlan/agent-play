/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-delivery-dash-stage
 *
 * Delivery Dash arcade stage — move across a grid to reach the goal.
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
import { buildGameStageExitProximityTarget } from "./game-stage-proximity.js";

const GRID_COLS = 8;
const GRID_ROWS = 4;
const START = { x: 1, y: 4 };
const GOAL = { x: 8, y: 4 };

const GRID_CELL = 0.85;
const GRID_ORIGIN_X = 1;
const GRID_ORIGIN_Y = 2.2;

const gridPosToStageCell = (gridPos: {
  x: number;
  y: number;
}): { x: number; y: number } => ({
  x: GRID_ORIGIN_X + (gridPos.x - 1) * GRID_CELL + GRID_CELL / 2,
  y: GRID_ORIGIN_Y + (gridPos.y - 3) * GRID_CELL + GRID_CELL / 2,
});

const drawGrid = (input: {
  layer: Container;
  cellScale: number;
}): void => {
  const g = new Graphics();
  const originX = 1 * input.cellScale;
  const originY = 2.2 * input.cellScale;
  const cell = input.cellScale * 0.85;
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const x = originX + col * cell;
      const y = originY + row * cell;
      g.rect(x, y, cell - 2, cell - 2).fill({ color: 0x1e293b, alpha: 0.6 });
      g.rect(x, y, cell - 2, cell - 2).stroke({
        color: 0x475569,
        width: 1,
        alpha: 0.5,
      });
    }
  }
  const goalX = originX + (GOAL.x - 1) * cell;
  const goalY = originY + (GOAL.y - 3) * cell;
  g.rect(goalX, goalY, cell - 2, cell - 2).fill({ color: 0x047857, alpha: 0.85 });
  input.layer.addChild(g);
};

const gridToPixel = (pos: { x: number; y: number }, cellScale: number): { x: number; y: number } => {
  const cell = cellScale * 0.85;
  return {
    x: 1 * cellScale + (pos.x - 1) * cell + cell / 2,
    y: 2.2 * cellScale + (pos.y - 3) * cell + cell / 2,
  };
};

/**
 * Build the Delivery Dash arcade stage.
 *
 * @public
 */
export const buildGameDeliveryDashStage = (
  options: BuildGameStageOptions
): GameStageHandle => {
  const root = new Container();
  root.addChild(buildGameStageBackdrop(options.cellScale));
  root.addChild(
    buildGameStageTitle({ title: "COURIER LANE", cellScale: options.cellScale })
  );

  const playLayer = new Container();
  root.addChild(playLayer);
  drawGrid({ layer: playLayer, cellScale: options.cellScale });

  const courier = new Graphics();
  courier.circle(0, 0, options.cellScale * 0.28).fill({ color: 0xfbbf24 });
  courier.circle(0, 0, options.cellScale * 0.28).stroke({
    color: 0x78350f,
    width: 2,
  });
  playLayer.addChild(courier);

  const events: GameEvent[] = [];
  let pos = { ...START };
  let moves = 0;
  let hits = 0;
  let roundComplete = false;
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  const syncCourier = (): void => {
    const pixel = gridToPixel(pos, options.cellScale);
    courier.position.set(pixel.x, pixel.y);
  };
  syncCourier();

  const tryFinish = (): void => {
    if (roundComplete) return;
    if (pos.x !== GOAL.x || pos.y !== GOAL.y) return;
    const band: "fast" | "ok" | "slow" =
      moves <= 8 ? "fast" : moves <= 14 ? "ok" : "slow";
    events.push({ type: "delivery_finish", band, hits });
    finishGameRound({
      events,
      onComplete: options.onComplete,
      markComplete: () => {
        roundComplete = true;
      },
    });
  };

  const move = (dx: number, dy: number): void => {
    if (roundComplete) return;
    const next = {
      x: Math.min(GOAL.x, Math.max(1, pos.x + dx)),
      y: Math.min(4, Math.max(3, pos.y + dy)),
    };
    moves += 1;
    if (next.x === pos.x && next.y === pos.y) {
      hits += 1;
      return;
    }
    pos = next;
    syncCourier();
    tryFinish();
  };

  const exitDoorAnchor = mountExitDoor({ root, cellScale: options.cellScale });
  const exitTarget = buildGameStageExitProximityTarget(exitDoorAnchor);

  const courierTarget = (): {
    id: string;
    x: number;
    y: number;
    label: string;
    verb: string;
  } => {
    const cell = gridPosToStageCell(pos);
    return {
      id: "courier",
      x: cell.x,
      y: cell.y,
      label: "Courier",
      verb: "Move",
    };
  };

  const advanceCourier = (): void => {
    if (pos.x < GOAL.x) {
      move(1, 0);
      return;
    }
    if (pos.y > 3) {
      move(0, -1);
      return;
    }
    if (pos.y < GOAL.y) {
      move(0, 1);
    }
  };

  return {
    id: "gameDeliveryDash",
    root,
    attach: () => {
      keyHandler = (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") move(0, -1);
        if (event.key === "ArrowDown") move(0, 1);
        if (event.key === "ArrowLeft") move(-1, 0);
        if (event.key === "ArrowRight") move(1, 0);
      };
      window.addEventListener("keydown", keyHandler);
    },
    detach: () => {
      if (keyHandler !== null) {
        window.removeEventListener("keydown", keyHandler);
        keyHandler = null;
      }
    },
    destroy: () => {
      if (keyHandler !== null) {
        window.removeEventListener("keydown", keyHandler);
      }
      root.destroy({ children: true });
    },
    completeRound: () => ({ events: [...events] }),
    clampPosition: (posIn) => clampToBounds(posIn, GAME_STAGE_BOUNDS),
    exitDoorAnchor,
    listProximityTargets: () =>
      roundComplete ? [exitTarget] : [courierTarget(), exitTarget],
    activateProximityTarget: (id) => {
      if (id === "courier") {
        advanceCourier();
        return true;
      }
      return false;
    },
  };
};
