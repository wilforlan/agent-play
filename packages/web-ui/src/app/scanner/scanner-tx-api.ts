import type { ScannerTxRecord } from "@agent-play/sdk";

export const fetchScannerTx = async (txId: string): Promise<ScannerTxRecord> => {
  const res = await fetch(`/api/scanner/txs/${encodeURIComponent(txId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Transaction not found");
  if (!res.ok) throw new Error("Failed to load transaction");
  const body = (await res.json()) as { tx: ScannerTxRecord };
  return body.tx;
};
