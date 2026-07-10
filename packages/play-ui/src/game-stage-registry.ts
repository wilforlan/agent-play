/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-stage-registry
 *
 * Maps {@link GameId} values to {@link StageId} and builds the
 * corresponding arcade stage handle.
 */

import type { GameId } from "@agent-play/sdk/browser";
import { featuredGameIdForUtcDate } from "@agent-play/sdk/browser";
import type { StageId } from "./stage-controller.js";
import type { BuildGameStageOptions, GameStageHandle } from "./game-stage-base.js";
import { buildGameHiddenGemsStage } from "./game-hidden-gems-stage.js";
import { buildGameMapRecallStage } from "./game-map-recall-stage.js";
import { buildGamePriceCheckStage } from "./game-price-check-stage.js";
import { buildGameSignalHuntStage } from "./game-signal-hunt-stage.js";
import { buildGameDeliveryDashStage } from "./game-delivery-dash-stage.js";
import { buildGameLeaseLockerStage } from "./game-lease-locker-stage.js";
import { buildGameTalkTimerStage } from "./game-talk-timer-stage.js";

/**
 * Map a playable game id to its stage controller id.
 *
 * @public
 */
export const stageIdForGameId = (gameId: GameId): StageId => {
  switch (gameId) {
    case "hidden-gems":
      return "gameHiddenGems";
    case "map-recall":
      return "gameMapRecall";
    case "price-check":
      return "gamePriceCheck";
    case "signal-hunt":
      return "gameSignalHunt";
    case "delivery-dash":
      return "gameDeliveryDash";
    case "lease-locker":
      return "gameLeaseLocker";
    case "talk-timer":
      return "gameTalkTimer";
    case "daily-rotator":
      throw new Error("game-stage-registry: daily-rotator is not a stage id");
  }
};

/**
 * Alias for {@link stageIdForGameId}.
 *
 * @public
 */
export const gameIdToStageId = stageIdForGameId;

export type PlayableGameId = Exclude<GameId, "daily-rotator">;

export const resolvePlayableGameId = (
  gameId: GameId,
  featuredGameId?: GameId
): PlayableGameId => {
  if (gameId !== "daily-rotator") return gameId;
  const featured =
    featuredGameId ?? featuredGameIdForUtcDate(new Date());
  if (featured === "daily-rotator") return "hidden-gems";
  return featured;
};

/**
 * Every playable game id mapped to its stage id.
 *
 * @public
 */
export const PLAYABLE_GAME_STAGE_IDS: Readonly<Record<PlayableGameId, StageId>> = {
  "hidden-gems": "gameHiddenGems",
  "map-recall": "gameMapRecall",
  "price-check": "gamePriceCheck",
  "signal-hunt": "gameSignalHunt",
  "delivery-dash": "gameDeliveryDash",
  "lease-locker": "gameLeaseLocker",
  "talk-timer": "gameTalkTimer",
};

/**
 * Build the arcade stage for the supplied game id.
 *
 * @public
 */
export const buildGameStage = (
  gameId: GameId,
  options: BuildGameStageOptions
): GameStageHandle => {
  switch (gameId) {
    case "hidden-gems":
      return buildGameHiddenGemsStage(options);
    case "map-recall":
      return buildGameMapRecallStage(options);
    case "price-check":
      return buildGamePriceCheckStage(options);
    case "signal-hunt":
      return buildGameSignalHuntStage(options);
    case "delivery-dash":
      return buildGameDeliveryDashStage(options);
    case "lease-locker":
      return buildGameLeaseLockerStage(options);
    case "talk-timer":
      return buildGameTalkTimerStage(options);
    case "daily-rotator":
      throw new Error("game-stage-registry: cannot build daily-rotator stage");
  }
};
