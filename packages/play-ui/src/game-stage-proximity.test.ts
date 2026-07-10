// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_STAGE_PROXIMITY_RADIUS,
  GAME_STAGE_EXIT_TARGET_ID,
  buildGameStageExitProximityTarget,
  buildGameTapButtonProximityTarget,
  findNearestGameStageProximityTarget,
  type GameStageProximityTarget,
} from "./game-stage-proximity.js";
import { buildGameHiddenGemsStage } from "./game-hidden-gems-stage.js";

describe("game-stage-proximity", () => {
  it("finds the nearest target within radius", () => {
    const targets: ReadonlyArray<GameStageProximityTarget> = [
      { id: "a", x: 2, y: 2, label: "Alpha", verb: "Pick" },
      { id: "b", x: 5, y: 2, label: "Bravo", verb: "Pick" },
    ];
    const near = findNearestGameStageProximityTarget({
      player: { x: 4.8, y: 2.1 },
      targets,
      radius: DEFAULT_GAME_STAGE_PROXIMITY_RADIUS,
    });
    expect(near?.id).toBe("b");
  });

  it("returns null when every target is outside radius", () => {
    const targets: ReadonlyArray<GameStageProximityTarget> = [
      { id: "a", x: 0, y: 0, label: "Exit", verb: "Leave" },
    ];
    const near = findNearestGameStageProximityTarget({
      player: { x: 8, y: 5 },
      targets,
      radius: 1,
    });
    expect(near).toBeNull();
  });

  it("prefers interactable targets over the exit door at equal distance", () => {
    const targets: ReadonlyArray<GameStageProximityTarget> = [
      buildGameStageExitProximityTarget({ x: 2, y: 2 }),
      { id: "chest-0", x: 2.2, y: 2.1, label: "Chest", verb: "Open" },
    ];
    const near = findNearestGameStageProximityTarget({
      player: { x: 2.1, y: 2.05 },
      targets,
      radius: 2,
    });
    expect(near?.id).toBe("chest-0");
  });

  it("builds tap-button targets at button center in cell coordinates", () => {
    const target = buildGameTapButtonProximityTarget({
      id: "higher",
      label: "Higher",
      verb: "Guess",
      x: 1.5,
      y: 4.2,
      widthCells: 3,
      heightCells: 1.1,
    });
    expect(target.x).toBe(3);
    expect(target.y).toBeCloseTo(4.75);
    expect(target.label).toBe("Higher");
  });

  it("hidden gems exposes the next chest and exit door as proximity targets", () => {
    const stage = buildGameHiddenGemsStage({ cellScale: 48 });
    const targets = stage.listProximityTargets?.() ?? [];
    expect(targets.some((target) => target.id === "chest-0")).toBe(true);
    expect(
      targets.some((target) => target.id === GAME_STAGE_EXIT_TARGET_ID)
    ).toBe(true);
  });

  it("hidden gems activates the next chest through proximity", () => {
    const stage = buildGameHiddenGemsStage({ cellScale: 48 });
    const activated = stage.activateProximityTarget?.("chest-0");
    expect(activated).toBe(true);
    const events = stage.completeRound().events;
    expect(events.some((event) => event.type === "chest_open")).toBe(true);
  });
});
