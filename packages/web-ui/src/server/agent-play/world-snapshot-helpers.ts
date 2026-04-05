import {
  buildSnapshotWorldMap,
  type PreviewSnapshotJson,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapOccupantJson,
} from "./preview-serialize.js";

export function emptySnapshot(sid: string): PreviewSnapshotJson {
  return { sid, worldMap: buildSnapshotWorldMap([]) };
}

export function ensureSnapshotSid(
  cached: PreviewSnapshotJson | null,
  sid: string
): PreviewSnapshotJson {
  if (cached === null) {
    return emptySnapshot(sid);
  }
  if (cached.sid !== sid) {
    throw new Error("snapshot session id mismatch");
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
