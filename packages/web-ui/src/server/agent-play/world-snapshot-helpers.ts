import {
  buildSnapshotWorldMap,
  type PreviewSnapshotJson,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapOccupantJson,
} from "./preview-serialize.js";

export function emptySnapshot(mainNodeId: string): PreviewSnapshotJson {
  return {
    sid: mainNodeId,
    mainNodeId,
    worldMap: buildSnapshotWorldMap([]),
  };
}

export function ensureWorldSnapshot(
  cached: PreviewSnapshotJson | null,
  mainNodeId: string
): PreviewSnapshotJson {
  if (cached === null) {
    return emptySnapshot(mainNodeId);
  }
  return cached;
}

export function upsertAgentOccupant(
  occupants: PreviewWorldMapOccupantJson[],
  row: PreviewWorldMapAgentOccupantJson
): PreviewWorldMapOccupantJson[] {
  const rest = occupants.filter(
    (o) => !(o.kind === "agent" && o.agentId === row.agentId)
  );
  return [...rest, row];
}

export function removeOccupantsForPlayer(
  occupants: PreviewWorldMapOccupantJson[],
  playerId: string
): PreviewWorldMapOccupantJson[] {
  return occupants.filter(
    (o) => !(o.kind === "agent" && o.agentId === playerId)
  );
}
