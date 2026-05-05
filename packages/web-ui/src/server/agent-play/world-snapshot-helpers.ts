import type { SpaceAmenityKind } from "./space-amenity.js";
import {
  buildSnapshotWorldMap,
  normalizePreviewSnapshot,
  type PreviewSnapshotJson,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapOccupantJson,
  type PreviewWorldMapStructureOccupantJson,
  type SpaceCatalogEntryJson,
} from "./preview-serialize.js";

export function emptySnapshot(mainNodeId: string): PreviewSnapshotJson {
  return {
    sid: mainNodeId,
    mainNodeId,
    worldMap: buildSnapshotWorldMap([]),
    spaces: [],
  };
}

export function ensureWorldSnapshot(
  cached: PreviewSnapshotJson | null,
  mainNodeId: string
): PreviewSnapshotJson {
  if (cached === null) {
    return emptySnapshot(mainNodeId);
  }
  return normalizePreviewSnapshot(cached);
}

export function upsertSpaceCatalogEntry(
  spaces: readonly SpaceCatalogEntryJson[],
  entry: SpaceCatalogEntryJson
): SpaceCatalogEntryJson[] {
  const rest = spaces.filter((s) => s.id !== entry.id);
  return [...rest, entry].sort((a, b) => a.id.localeCompare(b.id));
}

export function deriveStructureAmenityFields(
  spaceIds: readonly string[],
  catalog: readonly SpaceCatalogEntryJson[]
): {
  primaryAmenity?: SpaceAmenityKind;
  amenities: SpaceAmenityKind[];
} {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const merged: SpaceAmenityKind[] = [];
  const seen = new Set<string>();
  for (const sid of spaceIds) {
    const sp = byId.get(sid);
    if (sp === undefined) {
      continue;
    }
    for (const a of sp.amenities) {
      if (!seen.has(a)) {
        seen.add(a);
        merged.push(a);
      }
    }
  }
  return {
    primaryAmenity: merged[0],
    amenities: merged,
  };
}

export function upsertStructureOccupant(
  occupants: PreviewWorldMapOccupantJson[],
  row: PreviewWorldMapStructureOccupantJson
): PreviewWorldMapOccupantJson[] {
  const rest = occupants.filter(
    (o) => !(o.kind === "structure" && o.id === row.id)
  );
  return [...rest, row];
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
