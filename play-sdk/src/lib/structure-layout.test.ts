import { describe, expect, it } from "vitest";
import {
  enrichJourneyPath,
  layoutStructuresFromTools,
} from "./structure-layout.js";
import type { Journey } from "../@types/world.js";

const layoutOpts = (playerId: string, laneIndex = 0) => ({
  playerId,
  laneIndex,
});

describe("layoutStructuresFromTools", () => {
  it("places home and tools on a stable grid by sorted name in lane 0", () => {
    const s = layoutStructuresFromTools(
      ["search", "calculate"],
      layoutOpts("player-test", 0)
    );
    expect(s[0]).toMatchObject({
      kind: "home",
      x: 0,
      y: 0,
      id: "structure_home_player-test",
    });
    expect(s[1]).toMatchObject({
      toolName: "calculate",
      x: 1,
      y: 1,
      id: "structure_player-test_calculate",
    });
    expect(s[2]).toMatchObject({
      toolName: "search",
      x: 2,
      y: 1,
      id: "structure_player-test_search",
    });
  });

  it("offsets lane by laneIndex for multiverse stacking", () => {
    const s = layoutStructuresFromTools(["a"], layoutOpts("p2", 1));
    expect(s[0]?.y).toBe(16);
    expect(s[1]).toMatchObject({ toolName: "a", x: 1, y: 17 });
  });

  it("deduplicates tool names in the list but keeps home + one node per unique tool", () => {
    expect(
      layoutStructuresFromTools(["a", "a"], layoutOpts("pid", 0)).length
    ).toBe(2);
  });
});

describe("enrichJourneyPath", () => {
  it("maps structure steps to layout coordinates", () => {
    const structures = layoutStructuresFromTools(
      ["alpha"],
      layoutOpts("journey-player", 0)
    );
    const journey: Journey = {
      startedAt: new Date(),
      completedAt: new Date(),
      steps: [
        {
          type: "origin",
          content: "hi",
          messageId: "1",
        },
        {
          type: "structure",
          toolName: "alpha",
          toolCallId: "tc1",
          args: {},
          result: "ok",
        },
        {
          type: "destination",
          content: "done",
          messageId: "2",
        },
      ],
    };
    const path = enrichJourneyPath(journey, structures);
    expect(path[0]?.x).toBe(0);
    expect(path[0]?.y).toBe(0);
    expect(path[1]?.structureId).toBe("structure_journey-player_alpha");
    expect(path[1]?.x).toBe(1);
    expect(path[2]?.x).toBe(0);
  });
});
