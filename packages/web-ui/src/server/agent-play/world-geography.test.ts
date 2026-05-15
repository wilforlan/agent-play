import { describe, expect, it } from "vitest";
import {
  buildGeographyHumanOccupantJson,
  buildGeographyPlayerChainFanoutNotify,
  geographyStableKey,
  parseGeographyHumanState,
} from "./world-geography.js";

describe("world-geography", () => {
  it("builds stable key human:{id}", () => {
    expect(geographyStableKey("node-a")).toBe("human:node-a");
  });

  it("parses geography human state", () => {
    const state = parseGeographyHumanState({
      id: "node-a",
      name: "Ada",
      x: 1.5,
      y: 2.5,
      facing: "left",
      isMoving: true,
    });
    expect(state).toEqual({
      id: "node-a",
      name: "Ada",
      x: 1.5,
      y: 2.5,
      facing: "left",
      isMoving: true,
    });
  });

  it("buildGeographyPlayerChainFanoutNotify emits join and position updates", () => {
    const prev = new Map<string, ReturnType<typeof parseGeographyHumanState>>();
    const next = new Map([
      [
        "node-a",
        parseGeographyHumanState({
          id: "node-a",
          name: "Ada",
          x: 0,
          y: 0,
        }),
      ],
    ]);
    const join = buildGeographyPlayerChainFanoutNotify({ prev, next });
    expect(join?.nodes.some((n) => n.stableKey === "human:node-a")).toBe(true);

    prev.set("node-a", next.get("node-a")!);
    const moved = new Map(prev);
    moved.set(
      "node-a",
      parseGeographyHumanState({
        id: "node-a",
        name: "Ada",
        x: 3,
        y: 4,
      })
    );
    const moveNotify = buildGeographyPlayerChainFanoutNotify({
      prev,
      next: moved,
    });
    expect(moveNotify?.nodes.some((n) => n.stableKey === "human:node-a")).toBe(
      true
    );
  });

  it("buildGeographyPlayerChainFanoutNotify emits removed humans", () => {
    const prev = new Map([
      [
        "node-a",
        parseGeographyHumanState({
          id: "node-a",
          name: "Ada",
          x: 1,
          y: 2,
        }),
      ],
    ]);
    const notify = buildGeographyPlayerChainFanoutNotify({
      prev,
      next: new Map(),
    });
    expect(notify?.nodes.some((n) => n.removed === true)).toBe(true);
  });

  it("buildGeographyHumanOccupantJson matches preview occupant shape", () => {
    const occ = buildGeographyHumanOccupantJson(
      parseGeographyHumanState({
        id: "node-a",
        name: "Ada",
        x: 1,
        y: 2,
        facing: "right",
        isMoving: false,
      })
    );
    expect(occ).toEqual({
      kind: "human",
      id: "node-a",
      name: "Ada",
      x: 1,
      y: 2,
      facing: "right",
      isMoving: false,
    });
  });
});
