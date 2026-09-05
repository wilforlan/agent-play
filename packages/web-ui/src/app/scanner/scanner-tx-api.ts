import type { ScannerTxRecord } from "@agent-play/sdk";

export type ScannerTxSolanaWallets = {
  from: string | null;
  to: string | null;
};

export type ScannerTxDetail = {
  tx: ScannerTxRecord;
  solanaWallets: ScannerTxSolanaWallets;
};

export const fetchScannerTx = async (txId: string): Promise<ScannerTxDetail> => {
  const res = await fetch(`/api/scanner/txs/${encodeURIComponent(txId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Transaction not found");
  if (!res.ok) throw new Error("Failed to load transaction");
  const body = (await res.json()) as {
    tx: ScannerTxRecord;
    solanaWallets?: ScannerTxSolanaWallets;
  };
  return {
    tx: body.tx,
    solanaWallets: body.solanaWallets ?? { from: null, to: null },
  };
};
