import {
  type AnalyticsEvent,
  type PlayerWallet,
  type PurchaseRecord,
  type ScannerBlockRecord,
  type ScannerTxRecord,
  type ScannerWalletSnapshot,
} from "@agent-play/sdk";
import {
  purchaseRecordToAnalyticsEvent,
  sessionEventTypeToAnalyticsEvent,
} from "../analytics/analytics-catalog.js";
import {
  buildScannerTxRecord,
} from "../scanner/scanner-indexer.js";

export type TestDoubleScannerMirror = {
  readonly hostId: string;
  readonly txRecords: Map<string, ScannerTxRecord>;
  readonly walletSnapshots: Map<string, ScannerWalletSnapshot>;
  readonly blocks: ScannerBlockRecord[];
  readonly analyticsEvents: AnalyticsEvent[];
};

export const createTestDoubleScannerMirror = (
  hostId = "test"
): TestDoubleScannerMirror => ({
  hostId,
  txRecords: new Map(),
  walletSnapshots: new Map(),
  blocks: [],
  analyticsEvents: [],
});

export const mirrorPurchaseRecord = (
  mirror: TestDoubleScannerMirror,
  record: PurchaseRecord
): void => {
  const row = buildScannerTxRecord({
    hostId: mirror.hostId,
    record,
  });
  if (mirror.txRecords.has(row.id)) return;
  mirror.txRecords.set(row.id, row);
  mirror.analyticsEvents.push(
    purchaseRecordToAnalyticsEvent({
      hostId: mirror.hostId,
      record,
      messageId: `purchase:${record.id}`,
    })
  );
};

export const mirrorWalletBalance = (
  mirror: TestDoubleScannerMirror,
  wallet: PlayerWallet
): void => {
  const row: ScannerWalletSnapshot = {
    playerId: wallet.playerId,
    balanceUsd: wallet.balanceUsd,
    powerUps: wallet.powerUps,
    updatedAt: wallet.updatedAt,
  };
  mirror.walletSnapshots.set(wallet.playerId, row);
};

export const mirrorBlock = (
  mirror: TestDoubleScannerMirror,
  block: ScannerBlockRecord
): void => {
  mirror.blocks.unshift(block);
  if (mirror.blocks.length > 10_000) {
    mirror.blocks.length = 10_000;
  }
};

export const mirrorEventLogEntry = (
  mirror: TestDoubleScannerMirror,
  entry: { type: string; at: string; summary: string },
  messageId: string
): void => {
  const event = sessionEventTypeToAnalyticsEvent({
    hostId: mirror.hostId,
    type: entry.type,
    at: entry.at,
    summary: entry.summary,
    messageId,
    backfilled: false,
  });
  if (event === null) return;
  const existing = mirror.analyticsEvents.some(
    (row) => row.messageId === event.messageId
  );
  if (existing) return;
  mirror.analyticsEvents.push(event);
};
