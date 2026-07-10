import type Redis from "ioredis";
import {
  ScannerBlockRecordSchema,
  ScannerTxRecordSchema,
  ScannerWalletSnapshotSchema,
  type PurchaseRecord,
  type ScannerBlockRecord,
  type ScannerTxOp,
  type ScannerTxRecord,
  type ScannerWalletSnapshot,
} from "@agent-play/sdk";
import {
  scannerBlocksKey,
  scannerTxByPlayerKey,
  scannerTxKey,
  scannerTxsKey,
  scannerWalletKey,
  scannerWalletsKey,
} from "./scanner-keys.js";

const SCANNED_BLOCKS_MAX = 10_000;

const timestampToScore = (iso: string): number => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
};

export const amenityKindToScannerOp = (
  amenityKind: PurchaseRecord["amenityKind"]
): ScannerTxOp => {
  if (amenityKind === "wallet_bundle") return "redeemWalletBundle";
  if (amenityKind === "apu_credit" || amenityKind === "apu_debit") {
    return "applyGameOutcome";
  }
  if (amenityKind === "talk_time") return "talkTick";
  return "purchase";
};

export const buildScannerTxRecord = (input: {
  hostId: string;
  record: PurchaseRecord;
  op?: ScannerTxOp;
  indexedAt?: string;
  blockRev?: number;
  merkleRootHex?: string;
}): ScannerTxRecord => {
  const indexedAt = input.indexedAt ?? new Date().toISOString();
  return ScannerTxRecordSchema.parse({
    ...input.record,
    hostId: input.hostId,
    indexedAt,
    op: input.op ?? amenityKindToScannerOp(input.record.amenityKind),
    blockRev: input.blockRev,
    merkleRootHex: input.merkleRootHex,
  });
};

export const indexPurchaseRecord = async (input: {
  redis: Redis;
  hostId: string;
  record: PurchaseRecord;
  op?: ScannerTxOp;
  blockRev?: number;
  merkleRootHex?: string;
}): Promise<void> => {
  const row = buildScannerTxRecord({
    hostId: input.hostId,
    record: input.record,
    op: input.op,
    blockRev: input.blockRev,
    merkleRootHex: input.merkleRootHex,
  });
  const score = timestampToScore(row.at);
  const txKey = scannerTxKey(input.hostId, row.id);
  const existing = await input.redis.get(txKey);
  if (existing !== null) return;

  const multi = input.redis.multi();
  multi.set(txKey, JSON.stringify(row));
  multi.zadd(scannerTxsKey(input.hostId), score, row.id);
  multi.zadd(scannerTxByPlayerKey(input.hostId, row.playerId), score, row.id);
  await multi.exec();

  const { bumpScannerHeadOnTx } = await import("./scanner-cache.js");
  await bumpScannerHeadOnTx({
    redis: input.redis,
    hostId: input.hostId,
    tx: row,
  });
};

export const indexBlock = async (input: {
  redis: Redis;
  hostId: string;
  block: ScannerBlockRecord;
}): Promise<void> => {
  const row = ScannerBlockRecordSchema.parse(input.block);
  const multi = input.redis.multi();
  multi.lpush(scannerBlocksKey(input.hostId), JSON.stringify(row));
  multi.ltrim(scannerBlocksKey(input.hostId), 0, SCANNED_BLOCKS_MAX - 1);
  await multi.exec();

  const { bumpScannerHeadOnBlock } = await import("./scanner-cache.js");
  await bumpScannerHeadOnBlock({
    redis: input.redis,
    hostId: input.hostId,
    block: row,
  });
};

export const indexWalletBalance = async (input: {
  redis: Redis;
  hostId: string;
  wallet: ScannerWalletSnapshot;
}): Promise<void> => {
  const row = ScannerWalletSnapshotSchema.parse(input.wallet);
  const multi = input.redis.multi();
  multi.set(scannerWalletKey(input.hostId, row.playerId), JSON.stringify(row));
  multi.zadd(scannerWalletsKey(input.hostId), row.powerUps, row.playerId);
  await multi.exec();
};

export const getScannerTx = async (input: {
  redis: Redis;
  hostId: string;
  txId: string;
}): Promise<ScannerTxRecord | null> => {
  const raw = await input.redis.get(scannerTxKey(input.hostId, input.txId));
  if (raw === null) return null;
  try {
    return ScannerTxRecordSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
};
