import { GAME_CABINET_CATALOG, type WorldLayout } from "@agent-play/sdk";
import { resolveStructureAnchorsAtRuntime } from "./grid-allocate.js";
import type {
  PreviewSnapshotJson,
  PreviewWorldMapStructureOccupantJson,
} from "./preview-serialize.js";
import type { GameId } from "@agent-play/sdk";

export function ensureArcadeCabinetsInSnapshot(input: {
  snapshot: PreviewSnapshotJson;
  worldLayout: WorldLayout;
}): PreviewSnapshotJson {
  const existingIds = new Set(
    input.snapshot.worldMap.occupants
      .filter(
        (o): o is PreviewWorldMapStructureOccupantJson =>
          o.kind === "structure" && typeof o.gameId === "string"
      )
      .map((o) => o.id)
  );
  const missing = GAME_CABINET_CATALOG.filter((entry) => !existingIds.has(entry.id));
  if (missing.length === 0) {
    return resolveStructureAnchorsAtRuntime(input.snapshot);
  }
  const newRows: PreviewWorldMapStructureOccupantJson[] = missing.map(
    (entry) => ({
      kind: "structure",
      id: entry.id,
      name: entry.name,
      x: 0,
      y: 0,
      worldId: "overworld",
      spaceIds: [],
      gameId: entry.gameId,
      stationary: true,
    })
  );
  const withRows: PreviewSnapshotJson = {
    ...input.snapshot,
    worldMap: {
      ...input.snapshot.worldMap,
      occupants: [...input.snapshot.worldMap.occupants, ...newRows],
    },
  };
  return resolveStructureAnchorsAtRuntime(withRows);
}

export type RegisterArcadeCabinetInput = {
  id?: string;
  name: string;
  gameId: GameId;
};

export const buildArcadeCabinetRow = (input: {
  id: string;
  name: string;
  gameId: GameId;
  x: number;
  y: number;
}): PreviewWorldMapStructureOccupantJson => ({
  kind: "structure",
  id: input.id,
  name: input.name,
  x: input.x,
  y: input.y,
  worldId: "overworld",
  spaceIds: [],
  gameId: input.gameId,
  stationary: true,
});
