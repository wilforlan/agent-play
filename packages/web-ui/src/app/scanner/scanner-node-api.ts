import type { ScannerNodeProfile, ScannerTxRecord } from "@agent-play/sdk";

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

export const fetchScannerNodeTxs = async (input: {
  nodeId: string;
  page?: number;
  limit?: number;
}): Promise<{
  txs: ScannerTxRecord[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}> => {
  const params = new URLSearchParams();
  params.set("section", "txs");
  params.set("limit", String(input.limit ?? 25));
  if (input.page !== undefined) params.set("page", String(input.page));
  const res = await fetch(
    `/api/scanner/nodes/${encodeURIComponent(input.nodeId)}?${params.toString()}`,
    { cache: "no-store" }
  );
  if (res.status === 404) throw new Error("Node not found");
  if (!res.ok) throw new Error("Failed to load node transactions");
  return (await res.json()) as {
    txs: ScannerTxRecord[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};
