import type { PreviewSnapshotJson } from "./preview-serialize.js";

export const resolveSpaceOwnerWalletPlayerId = (
  snap: PreviewSnapshotJson | null,
  spaceId: string
): string | null => {
  const row = snap?.spaces?.find((s) => s.id === spaceId.trim());
  const nodeId = row?.owner.nodeId?.trim() ?? "";
  return nodeId.length > 0 ? nodeId : null;
};
