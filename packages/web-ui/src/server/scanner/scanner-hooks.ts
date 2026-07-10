import type Redis from "ioredis";
import {
  ANALYTICS_EVENT_NAMES,
  type PlayerWallet,
  type PurchaseRecord,
  type ScannerBlockRecord,
  type ScannerTxOp,
} from "@agent-play/sdk";
import { purchaseRecordToAnalyticsEvent } from "../analytics/analytics-catalog.js";
import { trackEvent } from "../analytics/analytics-tracker.js";
import {
  indexBlock,
  indexPurchaseRecord,
  indexWalletBalance,
} from "./scanner-indexer.js";

export const safeIndexPurchaseRecord = (input: {
  redis: Redis;
  hostId: string;
  record: PurchaseRecord;
  op?: ScannerTxOp;
}): void => {
  void indexPurchaseRecord(input).catch(() => undefined);
  void trackEvent({
    redis: input.redis,
    hostId: input.hostId,
    event: purchaseRecordToAnalyticsEvent({
      hostId: input.hostId,
      record: input.record,
      messageId: `purchase:${input.record.id}`,
    }),
  }).catch(() => undefined);
};

export const safeIndexWallet = (input: {
  redis: Redis;
  hostId: string;
  wallet: PlayerWallet;
}): void => {
  void indexWalletBalance({
    redis: input.redis,
    hostId: input.hostId,
    wallet: {
      playerId: input.wallet.playerId,
      balanceUsd: input.wallet.balanceUsd,
      powerUps: input.wallet.powerUps,
      updatedAt: input.wallet.updatedAt,
    },
  }).catch(() => undefined);
};

export const safeIndexBlock = (input: {
  redis: Redis;
  hostId: string;
  block: ScannerBlockRecord;
}): void => {
  void indexBlock(input).catch(() => undefined);
  if ((input.block.leafDeltaCount ?? 0) <= 0) return;
  void trackEvent({
    redis: input.redis,
    hostId: input.hostId,
    event: {
      messageId: `block:${input.block.rev}:${input.block.at}`,
      event: ANALYTICS_EVENT_NAMES.chainRevisionPublished,
      distinctId: "system",
      timestamp: input.block.at,
      properties: {
        rev: input.block.rev,
        merkleRootHex: input.block.merkleRootHex,
        merkleLeafCount: input.block.merkleLeafCount,
        leafDeltaCount: input.block.leafDeltaCount ?? 0,
      },
      context: {
        hostId: input.hostId,
        library: "agent-play-server",
        snapshotRev: input.block.rev,
      },
    },
  }).catch(() => undefined);
};

export const safeTrackAnalyticsEvent = (input: {
  redis: Redis;
  hostId: string;
  event: Parameters<typeof trackEvent>[0]["event"];
}): void => {
  void trackEvent(input).catch(() => undefined);
};
