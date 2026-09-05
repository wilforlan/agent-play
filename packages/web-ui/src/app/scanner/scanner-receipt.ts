import type { ScannerTxRecord } from "@agent-play/sdk";

export type ApuWalletPair = {
  readonly from: string;
  readonly to: string | null;
};

export const apuWalletsFromTx = (tx: ScannerTxRecord): ApuWalletPair => {
  const counterparty =
    tx.counterpartyNodeId !== undefined && tx.counterpartyNodeId.length > 0
      ? tx.counterpartyNodeId
      : null;
  if (counterparty === null) {
    return { from: tx.playerId, to: null };
  }
  if (tx.amenityKind === "apu_credit") {
    return { from: counterparty, to: tx.playerId };
  }
  return { from: tx.playerId, to: counterparty };
};
