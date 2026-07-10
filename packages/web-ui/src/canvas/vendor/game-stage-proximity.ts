/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-stage-proximity
 *
 * Proximity helpers for arcade game stages — walk near an object to reveal
 * touch-bar / keyboard prompts.
 */

/**
 * A walk-up interactable inside an arcade game stage.
 *
 * @public
 */
export type GameStageProximityTarget = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly verb: string;
  readonly activatable?: boolean;
};

/**
 * Shared id for the exit-door proximity target.
 *
 * @public
 */
export const GAME_STAGE_EXIT_TARGET_ID = "exit-door";

/**
 * Default walk-up radius for in-stage interactables (world cells).
 *
 * @public
 */
export const DEFAULT_GAME_STAGE_PROXIMITY_RADIUS = 1.35;

/**
 * Build the standard exit-door proximity target.
 *
 * @public
 */
export const buildGameStageExitProximityTarget = (anchor: {
  x: number;
  y: number;
}): GameStageProximityTarget => ({
  id: GAME_STAGE_EXIT_TARGET_ID,
  x: anchor.x,
  y: anchor.y,
  label: "Exit",
  verb: "Leave",
});

/**
 * Build a proximity target centered on a {@link buildGameTapButton} cell rect.
 *
 * @public
 */
export const buildGameTapButtonProximityTarget = (input: {
  id: string;
  label: string;
  verb?: string;
  x: number;
  y: number;
  widthCells: number;
  heightCells: number;
  activatable?: boolean;
}): GameStageProximityTarget => ({
  id: input.id,
  x: input.x + input.widthCells / 2,
  y: input.y + input.heightCells / 2,
  label: input.label,
  verb: input.verb ?? "Use",
  activatable: input.activatable,
});

/**
 * Pick the nearest in-range game-stage proximity target for the player pawn.
 *
 * @public
 */
export const findNearestGameStageProximityTarget = (options: {
  player: { x: number; y: number };
  targets: ReadonlyArray<GameStageProximityTarget>;
  radius: number;
}): GameStageProximityTarget | null => {
  const { player, targets, radius } = options;
  let best: GameStageProximityTarget | null = null;
  let bestDist = Infinity;
  for (const target of targets) {
    const dist = Math.hypot(player.x - target.x, player.y - target.y);
    if (dist > radius) continue;
    const isExit = target.id === GAME_STAGE_EXIT_TARGET_ID;
    if (best === null) {
      best = target;
      bestDist = dist;
      continue;
    }
    const bestIsExit = best.id === GAME_STAGE_EXIT_TARGET_ID;
    if (!isExit && bestIsExit) {
      best = target;
      bestDist = dist;
      continue;
    }
    if (isExit && !bestIsExit) {
      continue;
    }
    if (dist < bestDist) {
      best = target;
      bestDist = dist;
    }
  }
  return best;
};
