// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  computeGameStageLayout,
  gameStageSpawnPosition,
  GAME_STAGE_HEADER_BAND_PX,
} from "./game-stage-runtime.js";
import { GAME_STAGE_BOUNDS } from "./game-stage-base.js";

describe("game stage runtime", () => {
  it("computes cell scale that fills the viewport interior", () => {
    const layout = computeGameStageLayout({
      viewport: { width: 720, height: 520 },
      bounds: GAME_STAGE_BOUNDS,
    });
    const boundsW = GAME_STAGE_BOUNDS.maxX - GAME_STAGE_BOUNDS.minX;
    const boundsH = GAME_STAGE_BOUNDS.maxY - GAME_STAGE_BOUNDS.minY;
    const stageW = boundsW * layout.cellScale;
    const stageH = boundsH * layout.cellScale;
    const availableHeight = 520 - GAME_STAGE_HEADER_BAND_PX;
    expect(stageW).toBeLessThanOrEqual(720 + 0.5);
    expect(stageH).toBeLessThanOrEqual(availableHeight + 0.5);
    expect(Math.abs(stageW - 720)).toBeLessThan(2);
  });

  it("spawns the player near the bottom-centre away from the exit door", () => {
    const spawn = gameStageSpawnPosition(GAME_STAGE_BOUNDS);
    expect(spawn.x).toBe(GAME_STAGE_BOUNDS.maxX / 2);
    expect(spawn.y).toBe(GAME_STAGE_BOUNDS.maxY - 1);
  });
});
