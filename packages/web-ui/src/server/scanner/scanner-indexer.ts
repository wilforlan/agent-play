import type Redis from "ioredis";
import {
  PurchaseRecordSchema,
  ScannerBlockRecordSchema,
  ScannerTxRecordSchema,
  ScannerWalletSnapshotSchema,
  type PurchaseRecord,
  type ScannerBlockRecord,
  type ScannerTxOp,
  type ScannerTxRecord,
  type ScannerWalletSnapshot,
} from "@agent-play/sdk";
import { queueDailyMarketActivityIncrement } from "./daily-market-activity.js";
import { queueScannerEconomyIncrement } from "./scanner-economy-cache.js";
import {
  playerPurchasesScanPattern,
  scannerBlocksKey,
  scannerSupplyKey,
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
  if (amenityKind === "sol_deposit") return "solDeposit";
  if (amenityKind === "sol_payout") return "solPayout";
  if (amenityKind === "apu_credit" || amenityKind === "apu_debit") {
    return "applyGameOutcome";
  }
  if (amenityKind === "talk_time" || amenityKind === "peer_talk_time") {
    return "talkTick";
  }
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
  queueDailyMarketActivityIncrement(multi, {
    hostId: input.hostId,
    tx: row,
  });
  queueScannerEconomyIncrement(multi, {
    hostId: input.hostId,
    tx: row,
  });
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
  const walletKey = scannerWalletKey(input.hostId, row.playerId);
  const previousRaw = await input.redis.get(walletKey);
  let previousApu = 0;
  let previousUsd = 0;
  let isNew = true;
  if (previousRaw !== null) {
    try {
      const previous = ScannerWalletSnapshotSchema.parse(JSON.parse(previousRaw));
      previousApu = previous.powerUps;
      previousUsd = previous.balanceUsd;
      isNew = false;
    } catch {
      isNew = true;
    }
  }
  const multi = input.redis.multi();
  multi.set(walletKey, JSON.stringify(row));
  multi.zadd(scannerWalletsKey(input.hostId), row.powerUps, row.playerId);
  const supplyKey = scannerSupplyKey(input.hostId);
  const apuDelta = row.powerUps - previousApu;
  const usdDelta = row.balanceUsd - previousUsd;
  if (apuDelta !== 0) {
    multi.hincrby(supplyKey, "circulatingApu", apuDelta);
  }
  if (usdDelta !== 0) {
    multi.hincrbyfloat(supplyKey, "marketUsd", usdDelta);
  }
  if (isNew) {
    multi.hincrby(supplyKey, "walletCount", 1);
  }
  await multi.exec();
};

const SCAN_COUNT = 200;

export const findPurchaseRecordById = async (input: {
  redis: Redis;
  hostId: string;
  txId: string;
}): Promise<PurchaseRecord | null> => {
  let cursor = "0";
  do {
    const [next, keys] = await input.redis.scan(
      cursor,
      "MATCH",
      playerPurchasesScanPattern(input.hostId),
      "COUNT",
      SCAN_COUNT
    );
    cursor = next;
    for (const key of keys) {
      const lines = await input.redis.lrange(key, 0, -1);
      for (const line of lines) {
        try {
          const record = PurchaseRecordSchema.parse(JSON.parse(line));
          if (record.id === input.txId) {
            return record;
          }
        } catch {
          continue;
        }
      }
    }
  } while (cursor !== "0");
  return null;
};

export const getScannerTx = async (input: {
  redis: Redis;
  hostId: string;
  txId: string;
}): Promise<ScannerTxRecord | null> => {
  const persistEnriched = async (
    parsed: ScannerTxRecord,
  ): Promise<ScannerTxRecord> => {
    const {
      enrichScannerTxFromSibling,
      enrichScannerTxSolFromDetail,
      counterpartyFromTransferDetail,
      sourceFromScannerTx,
    } = await import("./daily-market-activity.js");
    let enriched = enrichScannerTxSolFromDetail(parsed);
    const fromDetail = counterpartyFromTransferDetail(enriched);
    if (enriched.counterpartyNodeId === undefined && fromDetail !== null) {
      enriched = { ...enriched, counterpartyNodeId: fromDetail };
    }
    if (
      sourceFromScannerTx(enriched) === "p2p" &&
      (enriched.counterpartyNodeId === undefined ||
        enriched.solLamportsDelta === undefined)
    ) {
      const atMs = Date.parse(enriched.at);
      if (Number.isFinite(atMs)) {
        const siblingIds = await input.redis.zrangebyscore(
          scannerTxsKey(input.hostId),
          atMs,
          atMs,
        );
        for (const siblingId of siblingIds) {
          if (siblingId === enriched.id) continue;
          const siblingRaw = await input.redis.get(
            scannerTxKey(input.hostId, siblingId),
          );
          if (siblingRaw === null) continue;
          try {
            const sibling = enrichScannerTxSolFromDetail(
              ScannerTxRecordSchema.parse(JSON.parse(siblingRaw)),
            );
            enriched = enrichScannerTxFromSibling({
              tx: enriched,
              sibling,
            });
          } catch {
            continue;
          }
        }
      }
    }
    if (
      enriched.solLamportsDelta !== parsed.solLamportsDelta ||
      enriched.feeLamports !== parsed.feeLamports ||
      enriched.counterpartyNodeId !== parsed.counterpartyNodeId
    ) {
      await input.redis.set(
        scannerTxKey(input.hostId, enriched.id),
        JSON.stringify(enriched),
      );
    }
    return enriched;
  };
  const raw = await input.redis.get(scannerTxKey(input.hostId, input.txId));
  if (raw !== null) {
    try {
      return await persistEnriched(ScannerTxRecordSchema.parse(JSON.parse(raw)));
    } catch {
      return null;
    }
  }

  const purchase = await findPurchaseRecordById(input);
  if (purchase === null) {
    return null;
  }
  await indexPurchaseRecord({
    redis: input.redis,
    hostId: input.hostId,
    record: purchase,
  });
  const indexed = await input.redis.get(scannerTxKey(input.hostId, input.txId));
  if (indexed === null) {
    return null;
  }
  try {
    return await persistEnriched(ScannerTxRecordSchema.parse(JSON.parse(indexed)));
  } catch {
    return null;
  }
};
