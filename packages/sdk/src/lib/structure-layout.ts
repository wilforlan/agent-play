import type {
  Journey,
  PositionedStep,
  WorldStructure,
} from "../@types/world.js";
import { agentPlayDebug } from "./agent-play-debug.js";

/** Number of columns when placing tool structures on a simple grid (see x/y below).
 * 3 is an arbitrary default, not a domain rule: it wraps many tools into a few rows instead of one
 * long line, keeps positions deterministic for the same sorted tool names (replay / comparisons),
 * and matches a common “small grid” width. Replace with config or a real map when the preview UI
 * defines fixed coordinates.
 *
 * Each player gets a vertical lane (`laneIndex * LANE_ROW_STRIDE`) so homes and tool grids do not
 * stack on top of other agents in the multiverse view. Structure ids are namespaced by `playerId`
 * so all tools show up in `worldMap` without cross-player dedupe collisions. */
const GRID_COLS = 3;

const LANE_ROW_STRIDE = 16;

export type LayoutStructuresOptions = {
  playerId: string;
  laneIndex: number;
};

function safePlayerKey(playerId: string): string {
  return playerId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function layoutStructuresFromTools(
  toolNames: string[],
  options: LayoutStructuresOptions
): WorldStructure[] {
  const { playerId, laneIndex } = options;
  const key = safePlayerKey(playerId);
  const oy = laneIndex * LANE_ROW_STRIDE;
  agentPlayDebug("structure-layout", "layoutStructuresFromTools", {
    toolNames: [...toolNames],
    playerKey: key,
    laneIndex,
    originY: oy,
  });
  const sorted = [...new Set(toolNames)].sort();
  const home: WorldStructure = {
    id: `structure_home_${key}`,
    kind: "home",
    x: 0,
    y: oy,
    label: "Home",
  };
  const toolStructures: WorldStructure[] = sorted.map((name, i) => ({
    id: `structure_${key}_${name}`,
    kind: "tool",
    x: (i % GRID_COLS) + 1,
    y: oy + Math.floor(i / GRID_COLS) + 1,
    toolName: name,
    label: name,
  }));
  const all = [home, ...toolStructures];
  agentPlayDebug("structure-layout", "layoutStructuresFromTools result", {
    structureCount: all.length,
  });
  return all;
}

export function enrichJourneyPath(
  journey: Journey,
  structures: WorldStructure[]
): PositionedStep[] {
  const byToolName = new Map<string, WorldStructure>();
  for (const s of structures) {
    if (s.toolName !== undefined) {
      byToolName.set(s.toolName, s);
    }
  }
  const home = structures.find((s) => s.kind === "home") ?? {
    id: "structure_home_fallback",
    kind: "home" as const,
    x: 0,
    y: 0,
    label: "Home",
  };

  return journey.steps.map((step): PositionedStep => {
    if (step.type === "origin") {
      return {
        ...step,
        x: home.x,
        y: home.y,
        structureId: home.id,
      };
    }
    if (step.type === "structure") {
      const s = byToolName.get(step.toolName);
      if (s !== undefined) {
        return {
          ...step,
          x: s.x,
          y: s.y,
          structureId: s.id,
        };
      }
      return { ...step };
    }
    return {
      ...step,
      x: home.x,
      y: home.y,
      structureId: home.id,
    };
  });
}
