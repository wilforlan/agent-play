import { GEOGRAPHY_AOI_HYSTERESIS_MS, GEOGRAPHY_MESH_DEGREE_MAX } from "./constants.js";
import type { GeographyVec2 } from "./schemas.js";

export type AoiMemberInput = {
  humanId: string;
  x: number;
  y: number;
  stage?: "overworld" | "space" | "amenity";
};

export type AoiSelectionState = {
  neighborIds: string[];
  truncated: boolean;
  enteredAtById: Record<string, number>;
  leaveCandidateSinceById: Record<string, number>;
};

export type SelectAoiNeighborsOptions = {
  selfId: string;
  selfPos: GeographyVec2;
  selfStage?: "overworld" | "space" | "amenity";
  members: readonly AoiMemberInput[];
  degreeMax?: number;
  nowMs: number;
  previous?: AoiSelectionState;
  hysteresisMs?: number;
};

const distanceSq = (
  a: GeographyVec2,
  b: { x: number; y: number }
): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const stageRank = (
  selfStage: string | undefined,
  memberStage: string | undefined
): number => {
  if (selfStage === undefined || memberStage === undefined) {
    return 1;
  }
  return selfStage === memberStage ? 0 : 1;
};

export const selectAoiNeighbors = (
  options: SelectAoiNeighborsOptions
): AoiSelectionState => {
  const {
    selfId,
    selfPos,
    selfStage,
    members,
    nowMs,
    previous,
  } = options;
  const degreeMax = options.degreeMax ?? GEOGRAPHY_MESH_DEGREE_MAX;
  const hysteresisMs = options.hysteresisMs ?? GEOGRAPHY_AOI_HYSTERESIS_MS;

  const candidates = members
    .filter((m) => m.humanId !== selfId)
    .map((m) => ({
      humanId: m.humanId,
      distSq: distanceSq(selfPos, m),
      stageRank: stageRank(selfStage, m.stage),
    }))
    .sort((a, b) => {
      if (a.stageRank !== b.stageRank) {
        return a.stageRank - b.stageRank;
      }
      if (a.distSq !== b.distSq) {
        return a.distSq - b.distSq;
      }
      return a.humanId.localeCompare(b.humanId);
    });

  const idealIds = candidates.slice(0, degreeMax).map((c) => c.humanId);
  const idealSet = new Set(idealIds);
  const truncated = candidates.length > degreeMax;

  const prevIds = previous?.neighborIds ?? [];
  const prevSet = new Set(prevIds);
  const enteredAtById: Record<string, number> = {
    ...(previous?.enteredAtById ?? {}),
  };
  const leaveCandidateSinceById: Record<string, number> = {
    ...(previous?.leaveCandidateSinceById ?? {}),
  };

  for (const id of Object.keys(leaveCandidateSinceById)) {
    if (idealSet.has(id) || !prevSet.has(id)) {
      delete leaveCandidateSinceById[id];
    }
  }

  for (const id of prevIds) {
    if (!idealSet.has(id)) {
      const since = leaveCandidateSinceById[id];
      if (since === undefined) {
        leaveCandidateSinceById[id] = nowMs;
      }
    }
  }

  const keptFromPrev: string[] = [];
  for (const id of prevIds) {
    if (idealSet.has(id)) {
      keptFromPrev.push(id);
      continue;
    }
    const since = leaveCandidateSinceById[id];
    if (since !== undefined && nowMs - since < hysteresisMs) {
      keptFromPrev.push(id);
    } else {
      delete leaveCandidateSinceById[id];
      delete enteredAtById[id];
    }
  }

  const nextIds: string[] = [...keptFromPrev];
  const nextSet = new Set(nextIds);
  for (const id of idealIds) {
    if (nextIds.length >= degreeMax) {
      break;
    }
    if (!nextSet.has(id)) {
      nextIds.push(id);
      nextSet.add(id);
      if (enteredAtById[id] === undefined) {
        enteredAtById[id] = nowMs;
      }
    }
  }

  for (const id of Object.keys(enteredAtById)) {
    if (!nextSet.has(id)) {
      delete enteredAtById[id];
    }
  }
  for (const id of nextIds) {
    if (enteredAtById[id] === undefined) {
      enteredAtById[id] = nowMs;
    }
  }

  return {
    neighborIds: nextIds.slice(0, degreeMax),
    truncated,
    enteredAtById,
    leaveCandidateSinceById,
  };
};
