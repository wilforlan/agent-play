import type { ScannerNodeProfile } from "@agent-play/sdk";

export const fetchScannerNodeProfile = async (
  nodeId: string
): Promise<ScannerNodeProfile> => {
  const res = await fetch(
    `/api/scanner/nodes/${encodeURIComponent(nodeId)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) throw new Error("Node not found");
  if (!res.ok) throw new Error("Failed to load node profile");
  const body = (await res.json()) as { profile: ScannerNodeProfile };
  return body.profile;
};
