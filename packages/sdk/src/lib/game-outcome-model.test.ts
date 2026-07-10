import { describe, expect, it } from "vitest";
import {
  computeEventPuDelta,
  computeRoundPuDelta,
  DAILY_GAME_PU_CAP,
  createEmptyGameStats,
} from "./game-outcome-model.js";

describe("game-outcome-model", () => {
  it("awards PU for correct chest opens after tutorial", () => {
    expect(
      computeRoundPuDelta([
        { type: "chest_open", correct: true, tutorial: true },
        { type: "chest_open", correct: false, tutorial: false },
      ])
    ).toBe(3);
  });

  it("computes delivery dash score bands", () => {
    expect(
      computeRoundPuDelta([
        { type: "delivery_finish", band: "fast", hits: 1 },
      ])
    ).toBe(13);
  });

  it("creates empty stats with daily cap", () => {
    const stats = createEmptyGameStats(new Date("2026-06-10T12:00:00Z"));
    expect(stats.puCapRemaining).toBe(DAILY_GAME_PU_CAP);
    expect(stats.puEarnedToday).toBe(0);
  });

  it("penalizes wrong price guess after round one", () => {
    expect(computeEventPuDelta({ type: "price_guess", correct: false, round: 2 })).toBe(
      -1
    );
  });
});
