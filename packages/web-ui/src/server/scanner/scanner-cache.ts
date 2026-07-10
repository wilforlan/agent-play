import type Redis from "ioredis";
import type { ScannerBlockRecord, ScannerTxRecord } from "@agent-play/sdk";
import { scannerKeyPrefix } from "./scanner-keys.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const scannerHeadCacheKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:head`;

export const scannerNodeCacheKey = (hostId: string, nodeId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:node:${nodeId}`;

const formatHourBucket = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}-${h}`;
};

export const scannerTxHourKey = (hostId: string, date: Date): string =>
  `${scannerKeyPrefix(hostId)}:cache:tx:hour:${formatHourBucket(date)}`;

export const scannerApuMintHourKey = (hostId: string, date: Date): string =>
  `${scannerKeyPrefix(hostId)}:cache:apu:mint:hour:${formatHourBucket(date)}`;

export const scannerApuBurnHourKey = (hostId: string, date: Date): string =>
  `${scannerKeyPrefix(hostId)}:cache:apu:burn:hour:${formatHourBucket(date)}`;

const hourBucketDates = (nowMs: number): Date[] => {
  const dates: Date[] = [];
  const base = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  for (let i = 0; i < 24; i += 1) {
    dates.push(new Date(base - i * HOUR_MS));
  }
  return dates;
};

const sumHourlyBuckets = async (
  redis: Redis,
  keys: string[]
): Promise<number> => {
  let total = 0;
  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) total += n;
  }
  return total;
};

export type ScannerHeadCache = {
  txsLast24h: number;
  apuMintedLast24h: number;
  apuBurnedLast24h: number;
  lastTxAtMs: number | null;
  snapshotRev: number | null;
  merkleRootHex: string | null;
  merkleLeafCount: number | null;
};

export const readScannerHeadCache = async (input: {
  redis: Redis;
  hostId: string;
  nowMs?: number;
}): Promise<ScannerHeadCache> => {
  const nowMs = input.nowMs ?? Date.now();
  const hours = hourBucketDates(nowMs);
  const txKeys = hours.map((d) => scannerTxHourKey(input.hostId, d));
  const mintKeys = hours.map((d) => scannerApuMintHourKey(input.hostId, d));
  const burnKeys = hours.map((d) => scannerApuBurnHourKey(input.hostId, d));

  const [txsLast24h, apuMintedLast24h, apuBurnedLast24h, headHash] =
    await Promise.all([
      sumHourlyBuckets(input.redis, txKeys),
      sumHourlyBuckets(input.redis, mintKeys),
      sumHourlyBuckets(input.redis, burnKeys),
      input.redis.hgetall(scannerHeadCacheKey(input.hostId)),
    ]);

  const lastTxRaw = headHash.lastTxAtMs;
  const lastTxAtMs =
    lastTxRaw !== undefined && lastTxRaw.length > 0
      ? Number(lastTxRaw)
      : null;

  return {
    txsLast24h,
    apuMintedLast24h,
    apuBurnedLast24h,
    lastTxAtMs: lastTxAtMs !== null && Number.isFinite(lastTxAtMs)
      ? lastTxAtMs
      : null,
    snapshotRev:
      headHash.snapshotRev !== undefined
        ? Number(headHash.snapshotRev)
        : null,
    merkleRootHex: headHash.merkleRootHex ?? null,
    merkleLeafCount:
      headHash.merkleLeafCount !== undefined
        ? Number(headHash.merkleLeafCount)
        : null,
  };
};

export const hasScannerHeadCache = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<boolean> => {
  const head = await input.redis.hgetall(scannerHeadCacheKey(input.hostId));
  return Object.keys(head).length > 0;
};

export const bumpScannerHeadOnTx = async (input: {
  redis: Redis;
  hostId: string;
  tx: ScannerTxRecord;
}): Promise<void> => {
  const atMs = Date.parse(input.tx.at);
  if (!Number.isFinite(atMs)) return;
  const date = new Date(atMs);

  await input.redis.incr(scannerTxHourKey(input.hostId, date));

  const delta = input.tx.powerUpsDelta ?? 0;
  if (delta > 0) {
    await input.redis.incrby(
      scannerApuMintHourKey(input.hostId, date),
      delta
    );
  }
  if (delta < 0) {
    await input.redis.incrby(
      scannerApuBurnHourKey(input.hostId, date),
      Math.abs(delta)
    );
  }

  await input.redis.hset(scannerHeadCacheKey(input.hostId), {
    lastTxAtMs: String(atMs),
    updatedAt: new Date().toISOString(),
  });

  const nodeKey = scannerNodeCacheKey(input.hostId, input.tx.playerId);
  const nodeHash = await input.redis.hgetall(nodeKey);
  const txCount = Number(nodeHash.txCount ?? 0) + 1;
  const usdSpent =
    Number(nodeHash.usdSpent ?? 0) + (input.tx.priceUsd ?? 0);
  const apuMinted = Number(nodeHash.apuMinted ?? 0) + (delta > 0 ? delta : 0);
  const apuBurned =
    Number(nodeHash.apuBurned ?? 0) + (delta < 0 ? Math.abs(delta) : 0);
  await input.redis.hset(nodeKey, {
    txCount: String(txCount),
    usdSpent: String(usdSpent),
    apuMinted: String(apuMinted),
    apuBurned: String(apuBurned),
    lastTxAt: input.tx.at,
    updatedAt: new Date().toISOString(),
  });
};

export const bumpScannerHeadOnBlock = async (input: {
  redis: Redis;
  hostId: string;
  block: ScannerBlockRecord;
}): Promise<void> => {
  await input.redis.hset(scannerHeadCacheKey(input.hostId), {
    snapshotRev: String(input.block.rev),
    merkleRootHex: input.block.merkleRootHex,
    merkleLeafCount: String(input.block.merkleLeafCount),
    updatedAt: new Date().toISOString(),
  });
};

export const rebuildScannerCacheFromIndexes = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<void> => {
  const { getScannerTx } = await import("./scanner-indexer.js");
  const { scannerTxsKey } = await import("./scanner-keys.js");

  const nowMs = Date.now();
  for (const date of hourBucketDates(nowMs)) {
    await input.redis.del(scannerTxHourKey(input.hostId, date));
    await input.redis.del(scannerApuMintHourKey(input.hostId, date));
    await input.redis.del(scannerApuBurnHourKey(input.hostId, date));
  }
  await input.redis.del(scannerHeadCacheKey(input.hostId));

  const sinceMs = nowMs - DAY_MS;
  const ids = await input.redis.zrangebyscore(
    scannerTxsKey(input.hostId),
    sinceMs,
    "+inf"
  );

  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx === null) continue;
    await bumpScannerHeadOnTx({
      redis: input.redis,
      hostId: input.hostId,
      tx,
    });
  }
};
