import type { WorldStructure } from "../@types/world.js";
import { agentPlayDebug } from "./agent-play-debug.js";

export type WorldMapStructure = WorldStructure & { playerId?: string };

export type PreviewWorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  structures: WorldMapStructure[];
};

export type PlayerStructuresRow = {
  playerId: string;
  structures: WorldStructure[];
};

const DEFAULT_BOUNDS: PreviewWorldMapJson["bounds"] = {
  minX: 0,
  minY: 0,
  maxX: 3,
  maxY: 3,
};

export function buildWorldMapFromPlayers(
  players: PlayerStructuresRow[]
): PreviewWorldMapJson {
  const byId = new Map<string, WorldMapStructure>();
  for (const p of players) {
    for (const s of p.structures) {
      if (byId.has(s.id)) {
        agentPlayDebug("world-map", "duplicate structure id; keeping first", {
          id: s.id,
          existingPlayerId: byId.get(s.id)?.playerId,
          skippedPlayerId: p.playerId,
        });
        continue;
      }
      byId.set(s.id, { ...s, playerId: p.playerId });
    }
  }
  const structures = [...byId.values()];
  if (structures.length === 0) {
    return { bounds: DEFAULT_BOUNDS, structures: [] };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of structures) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { bounds: DEFAULT_BOUNDS, structures };
  }
  return {
    bounds: { minX, minY, maxX, maxY },
    structures,
  };
}
