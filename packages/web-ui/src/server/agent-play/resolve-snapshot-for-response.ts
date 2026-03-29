import type { PreviewSnapshotJson } from "./preview-serialize.js";

function isCompleteSnapshot(
  value: PreviewSnapshotJson | null
): value is PreviewSnapshotJson {
  if (value === null) return false;
  if (typeof value.sid !== "string" || value.sid.length === 0) return false;
  if (!Array.isArray(value.players)) return false;
  if (value.worldMap === undefined || value.worldMap === null) return false;
  return true;
}

export function resolveSnapshotForResponse(options: {
  sid: string;
  live: PreviewSnapshotJson;
  cached: PreviewSnapshotJson | null;
}): PreviewSnapshotJson {
  const { sid, live, cached } = options;
  if (!isCompleteSnapshot(cached)) return live;
  if (cached.sid !== sid) return live;
  if (cached.players.length > live.players.length) return cached;
  return live;
}
