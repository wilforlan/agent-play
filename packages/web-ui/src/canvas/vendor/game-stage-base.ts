/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-stage-base
 *
 * Shared helpers for arcade mini-game stages.
 */

import { Container, Graphics, Text } from "pixi.js";
import {
  clampToBounds,
  mountExitDoor,
} from "./amenity-stage-base.js";
import type { StageHandle } from "./stage-controller.js";
import type { GameEvent } from "@agent-play/sdk/browser";
import type { GameStageProximityTarget } from "./game-stage-proximity.js";

export { clampToBounds, mountExitDoor };

/**
 * Rectangle defining a game stage walkable area in world cells.
 *
 * @public
 */
export type GameStageBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/**
 * Walkable bounds shared by every arcade game stage.
 *
 * @public
 */
export const GAME_STAGE_BOUNDS: GameStageBounds = {
  minX: 0,
  minY: 0,
  maxX: 10,
  maxY: 6,
};

/**
 * Options accepted when building any arcade game stage.
 *
 * @public
 */
export type BuildGameStageOptions = {
  readonly cellScale: number;
  readonly onComplete?: (result: { events: ReadonlyArray<GameEvent> }) => void;
  readonly tutorial?: boolean;
};

/**
 * Handle returned by every arcade game stage builder.
 *
 * @public
 */
export type GameStageHandle = StageHandle & {
  completeRound(): { events: ReadonlyArray<GameEvent> };
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
  listProximityTargets?: () => ReadonlyArray<GameStageProximityTarget>;
  activateProximityTarget?: (id: string) => boolean;
};

/**
 * Build a dark arcade floor backdrop sized to {@link GAME_STAGE_BOUNDS}.
 *
 * @public
 */
export const buildGameStageBackdrop = (cellScale: number): Container => {
  const root = new Container();
  const width = GAME_STAGE_BOUNDS.maxX * cellScale;
  const height = GAME_STAGE_BOUNDS.maxY * cellScale;
  const floor = new Graphics();
  floor.rect(0, 0, width, height).fill({ color: 0x141a24 });
  for (let yy = cellScale; yy < height; yy += cellScale) {
    floor.moveTo(0, yy).lineTo(width, yy).stroke({
      color: 0x1e293b,
      width: 0.6,
      alpha: 0.45,
    });
  }
  root.addChild(floor);
  return root;
};

/**
 * Build a labelled tap target for in-stage game UI.
 *
 * @public
 */
export const buildGameTapButton = (input: {
  label: string;
  x: number;
  y: number;
  widthCells: number;
  heightCells: number;
  cellScale: number;
  fill?: number;
  onTap: () => void;
}): Container => {
  const btn = new Container();
  const w = input.widthCells * input.cellScale;
  const h = input.heightCells * input.cellScale;
  const g = new Graphics();
  g.roundRect(0, 0, w, h, Math.max(6, input.cellScale * 0.2)).fill({
    color: input.fill ?? 0x334155,
  });
  g.roundRect(0, 0, w, h, Math.max(6, input.cellScale * 0.2)).stroke({
    color: 0x64748b,
    width: 1.5,
    alpha: 0.7,
  });
  btn.addChild(g);
  const text = new Text({
    text: input.label,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(11, Math.round(input.cellScale * 0.38)),
      fontWeight: "700",
      fill: 0xf8fafc,
    },
  });
  text.anchor.set(0.5);
  text.position.set(w / 2, h / 2);
  btn.addChild(text);
  btn.position.set(input.x * input.cellScale, input.y * input.cellScale);
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.on("pointertap", input.onTap);
  return btn;
};

/**
 * Build a title banner for a game stage.
 *
 * @public
 */
export const buildGameStageTitle = (input: {
  title: string;
  cellScale: number;
}): Text => {
  const banner = new Text({
    text: input.title,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(14, Math.round(input.cellScale * 0.5)),
      fontWeight: "800",
      fill: 0xe2e8f0,
      letterSpacing: 2,
    },
  });
  banner.anchor.set(0.5, 0);
  banner.position.set(
    (GAME_STAGE_BOUNDS.maxX * input.cellScale) / 2,
    input.cellScale * 0.2
  );
  return banner;
};

/**
 * Finish a round, optionally notifying the host via `onComplete`.
 *
 * @internal
 */
export const finishGameRound = (input: {
  events: ReadonlyArray<GameEvent>;
  onComplete?: BuildGameStageOptions["onComplete"];
  markComplete: () => void;
}): { events: ReadonlyArray<GameEvent> } => {
  input.markComplete();
  if (input.onComplete !== undefined) {
    input.onComplete({ events: input.events });
  }
  return { events: input.events };
};
