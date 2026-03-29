import { describe, expect, it } from "vitest";
import { buildWorldMapFromPlayers } from "./world-map.js";

describe("buildWorldMapFromPlayers", () => {
  it("returns default bounds when no structures", () => {
    const m = buildWorldMapFromPlayers([]);
    expect(m.structures).toHaveLength(0);
    expect(m.bounds).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 3 });
  });

  it("merges structures from two players and attaches playerId", () => {
    const m = buildWorldMapFromPlayers([
      {
        playerId: "p1",
        structures: [
          {
            id: "structure_home_p1",
            kind: "home",
            x: 0,
            y: 0,
            label: "Home",
          },
          {
            id: "structure_p1_a",
            kind: "tool",
            x: 1,
            y: 1,
            toolName: "a",
          },
        ],
      },
      {
        playerId: "p2",
        structures: [
          {
            id: "structure_home_p2",
            kind: "home",
            x: 0,
            y: 16,
            label: "Home",
          },
          {
            id: "structure_p2_b",
            kind: "tool",
            x: 2,
            y: 18,
            toolName: "b",
          },
        ],
      },
    ]);
    expect(m.structures).toHaveLength(4);
    expect(m.structures.find((s) => s.id === "structure_p1_a")?.playerId).toBe(
      "p1"
    );
    expect(m.structures.find((s) => s.id === "structure_p2_b")?.playerId).toBe(
      "p2"
    );
    expect(m.bounds).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 18 });
  });

  it("dedupes duplicate structure ids across players (first wins)", () => {
    const m = buildWorldMapFromPlayers([
      {
        playerId: "p1",
        structures: [
          { id: "structure_x", kind: "tool", x: 1, y: 0, toolName: "x" },
        ],
      },
      {
        playerId: "p2",
        structures: [
          { id: "structure_x", kind: "tool", x: 9, y: 9, toolName: "x" },
        ],
      },
    ]);
    expect(m.structures).toHaveLength(1);
    expect(m.structures[0]?.x).toBe(1);
    expect(m.structures[0]?.playerId).toBe("p1");
  });
});
