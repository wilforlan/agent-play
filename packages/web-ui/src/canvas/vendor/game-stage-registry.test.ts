// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { PLAYABLE_GAME_IDS } from "@agent-play/sdk/browser";
import {
  buildGameStage,
  gameIdToStageId,
  stageIdForGameId,
} from "./game-stage-registry";

describe("game-stage-registry: stageIdForGameId", () => {
  it("maps every playable game id to a camelCase game stage id", () => {
    const expected: Record<string, string> = {
      "hidden-gems": "gameHiddenGems",
      "map-recall": "gameMapRecall",
      "price-check": "gamePriceCheck",
      "signal-hunt": "gameSignalHunt",
      "delivery-dash": "gameDeliveryDash",
      "lease-locker": "gameLeaseLocker",
      "talk-timer": "gameTalkTimer",
    };
    for (const gameId of PLAYABLE_GAME_IDS) {
      expect(stageIdForGameId(gameId)).toBe(expected[gameId]);
    }
  });

  it("exposes gameIdToStageId as an alias", () => {
    expect(gameIdToStageId("hidden-gems")).toBe("gameHiddenGems");
    expect(gameIdToStageId("talk-timer")).toBe("gameTalkTimer");
  });
});

describe("game-stage-registry: buildGameStage", () => {
  it("returns a handle whose id matches the mapped stage id", () => {
    const handle = buildGameStage("hidden-gems", { cellScale: 32 });
    expect(handle.id).toBe("gameHiddenGems");
    handle.destroy();
  });

  it("builds a distinct stage for each playable game id", () => {
    for (const gameId of PLAYABLE_GAME_IDS) {
      const handle = buildGameStage(gameId, { cellScale: 24 });
      expect(handle.id).toBe(stageIdForGameId(gameId));
      handle.destroy();
    }
  });
});
