import { agentPlayVerbose } from "./agent-play-debug.js";
import { WORLD_GEOGRAPHY_EVENT } from "./play-transport.js";
import {
  digestLeaf,
  stableStringify,
  type PlayerChainFanoutNotify,
  type PlayerChainNotifyNodeRef,
} from "./player-chain/index.js";
import type { PreviewWorldMapHumanOccupantJson } from "./preview-serialize.js";

export { WORLD_GEOGRAPHY_EVENT };

export const GEOGRAPHY_REDIS_TTL_SECONDS = 300;

export type GeographyHumanState = {
  id: string;
  name: string;
  x: number;
  y: number;
  facing?: "left" | "right";
  isMoving?: boolean;
};

export function geographyStableKey(humanId: string): string {
  return `human:${humanId}`;
}

export function parseGeographyHumanState(
  raw: Record<string, unknown>
): GeographyHumanState {
  const idRaw =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.humanId === "string"
        ? raw.humanId
        : "";
  const id = idRaw.trim();
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const x = raw.x;
  const y = raw.y;
  if (id.length === 0) {
    throw new Error("geography: id is required");
  }
  if (name.length === 0) {
    throw new Error("geography: name is required");
  }
  if (typeof x !== "number" || !Number.isFinite(x)) {
    throw new Error("geography: x must be a finite number");
  }
  if (typeof y !== "number" || !Number.isFinite(y)) {
    throw new Error("geography: y must be a finite number");
  }
  const base: GeographyHumanState = { id, name, x, y };
  const facing =
    raw.facing === "left" || raw.facing === "right" ? raw.facing : undefined;
  const isMoving = typeof raw.isMoving === "boolean" ? raw.isMoving : undefined;
  return {
    ...base,
    ...(facing !== undefined ? { facing } : {}),
    ...(isMoving !== undefined ? { isMoving } : {}),
  };
}

export function buildGeographyHumanOccupantJson(
  state: GeographyHumanState
): PreviewWorldMapHumanOccupantJson {
  return {
    kind: "human",
    id: state.id,
    name: state.name,
    x: state.x,
    y: state.y,
    ...(state.facing === "left" || state.facing === "right"
      ? { facing: state.facing }
      : {}),
    ...(typeof state.isMoving === "boolean" ? { isMoving: state.isMoving } : {}),
  };
}

function leafDigestForGeographyHuman(state: GeographyHumanState): string {
  return digestLeaf(stableStringify(buildGeographyHumanOccupantJson(state)));
}

function sortedGeographyStates(
  map: ReadonlyMap<string, GeographyHumanState>
): GeographyHumanState[] {
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function diffGeographyHumans(
  prev: ReadonlyMap<string, GeographyHumanState>,
  next: ReadonlyMap<string, GeographyHumanState>
): { updates: string[]; removedKeys: string[] } {
  const prevDigests = new Map(
    [...prev.entries()].map(([id, s]) => [
      geographyStableKey(id),
      leafDigestForGeographyHuman(s),
    ])
  );
  const nextDigests = new Map(
    [...next.entries()].map(([id, s]) => [
      geographyStableKey(id),
      leafDigestForGeographyHuman(s),
    ])
  );
  const removedKeys: string[] = [];
  for (const key of prevDigests.keys()) {
    if (!nextDigests.has(key)) {
      removedKeys.push(key);
    }
  }
  const updates: string[] = [];
  for (const [key, digest] of nextDigests) {
    if (prevDigests.get(key) !== digest) {
      updates.push(key);
    }
  }
  return { updates, removedKeys };
}

export function buildGeographyPlayerChainFanoutNotify(options: {
  prev: ReadonlyMap<string, GeographyHumanState>;
  next: ReadonlyMap<string, GeographyHumanState>;
  updatedAt?: string;
}): PlayerChainFanoutNotify | undefined {
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  const diff = diffGeographyHumans(options.prev, options.next);
  if (diff.removedKeys.length === 0 && diff.updates.length === 0) {
    return undefined;
  }
  const prevSorted = sortedGeographyStates(options.prev);
  const nextSorted = sortedGeographyStates(options.next);
  const keyToPrevIndex = new Map(
    prevSorted.map((s, i) => [geographyStableKey(s.id), i])
  );
  const keyToNextIndex = new Map(
    nextSorted.map((s, i) => [geographyStableKey(s.id), i])
  );
  const removedNodes: PlayerChainNotifyNodeRef[] = diff.removedKeys.map(
    (stableKey) => ({
      stableKey,
      leafIndex: keyToPrevIndex.get(stableKey) ?? 0,
      removed: true,
      updatedAt,
    })
  );
  removedNodes.sort((a, b) => b.leafIndex - a.leafIndex);
  const updateNodes: PlayerChainNotifyNodeRef[] = diff.updates.map(
    (stableKey) => ({
      stableKey,
      leafIndex: keyToNextIndex.get(stableKey) ?? 0,
      removed: false,
      updatedAt,
    })
  );
  updateNodes.sort((a, b) => a.leafIndex - b.leafIndex);
  const notify: PlayerChainFanoutNotify = {
    updatedAt,
    nodes: [...removedNodes, ...updateNodes],
  };
  agentPlayVerbose("world-geography", "buildGeographyPlayerChainFanoutNotify", {
    removedCount: removedNodes.length,
    updateCount: updateNodes.length,
  });
  return notify;
}

export async function publishGeographyFanout(options: {
  store: {
    getSnapshotRev: () => Promise<number>;
    publishWorldFanout: (
      rev: number,
      event: string,
      data: unknown,
      options?: { playerChainNotify?: PlayerChainFanoutNotify }
    ) => Promise<void>;
  };
  prev: ReadonlyMap<string, GeographyHumanState>;
  next: ReadonlyMap<string, GeographyHumanState>;
  data: Record<string, unknown>;
}): Promise<void> {
  const playerChainNotify = buildGeographyPlayerChainFanoutNotify({
    prev: options.prev,
    next: options.next,
  });
  if (playerChainNotify === undefined) {
    return;
  }
  const rev = await options.store.getSnapshotRev();
  await options.store.publishWorldFanout(
    rev,
    WORLD_GEOGRAPHY_EVENT,
    options.data,
    { playerChainNotify }
  );
}
