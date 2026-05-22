import { describe, expect, it } from "vitest";
import {
  finiteOccupantPositions,
  resolveAgentMapCellForJourney,
} from "./agent-journey-cell.js";
import type { PreviewWorldMapAgentOccupantJson } from "./preview-serialize.js";

const agent = (
  overrides?: Partial<PreviewWorldMapAgentOccupantJson>
): PreviewWorldMapAgentOccupantJson => ({
  kind: "agent",
  agentId: "a1",
  name: "Agent",
  ...overrides,
});

describe("resolveAgentMapCellForJourney", () => {
  it("returns origin when occupant is undefined", () => {
    expect(resolveAgentMapCellForJourney(undefined)).toEqual({ x: 0, y: 0 });
  });

  it("returns occupant coordinates when both are finite numbers", () => {
    expect(resolveAgentMapCellForJourney(agent({ x: 3, y: 4 }))).toEqual({
      x: 3,
      y: 4,
    });
  });

  it("returns origin when coordinates are omitted", () => {
    expect(resolveAgentMapCellForJourney(agent())).toEqual({ x: 0, y: 0 });
  });

  it("returns origin when coordinates are non-finite", () => {
    expect(
      resolveAgentMapCellForJourney(agent({ x: Number.NaN, y: 1 }))
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("finiteOccupantPositions", () => {
  it("includes only occupants with finite coordinates", () => {
    const positions = finiteOccupantPositions([
      { kind: "human", id: "h1", name: "Human", x: 1, y: 2 },
      { kind: "agent", agentId: "a1", name: "Agent" },
      { kind: "mcp", id: "m1", name: "MCP", x: 5, y: 6 },
    ]);
    expect(positions).toEqual([
      { x: 1, y: 2 },
      { x: 5, y: 6 },
    ]);
  });
});
