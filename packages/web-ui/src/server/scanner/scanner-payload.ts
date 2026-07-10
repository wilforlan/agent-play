import type Redis from "ioredis";
import {
  ScannerHeadSchema,
  ScannerTxRecordSchema,
  type ScannerHead,
  type ScannerTxRecord,
} from "@agent-play/sdk";
import { buildPlatformAnalyticsPayload } from "../agent-play/platform-analytics-payload.js";
import { getPlayerChainGenesisSync } from "../agent-play/load-player-chain-genesis.js";
import type { PreviewSnapshotJson } from "../agent-play/preview-serialize.js";
import { buildPlayerChainFromSnapshot } from "../agent-play/player-chain/index.js";
import { ensureScannerBackfillStarted, readScannerMigrationState } from "./scanner-backfill.js";
import {
  hasScannerHeadCache,
  readScannerHeadCache,
} from "./scanner-cache.js";
import { getScannerTx } from "./scanner-indexer.js";
import { scannerTxsKey } from "./scanner-keys.js";

const SESSION_HASH_KEY = (hostId: string): string =>
  `agent-play:${hostId}:session`;

const DAY_MS = 24 * 60 * 60 * 1000;

const countSince = async (
  redis: Redis,
  key: string,
  sinceMs: number
): Promise<number> => {
  const ids = await redis.zrangebyscore(key, sinceMs, "+inf");
  return ids.length;
};

const sumApuFromTxs = async (input: {
  redis: Redis;
  hostId: string;
  sinceMs: number;
  direction: "mint" | "burn";
}): Promise<number> => {
  const ids = await input.redis.zrangebyscore(
    scannerTxsKey(input.hostId),
    input.sinceMs,
    "+inf"
  );
  let total = 0;
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx === null) continue;
    const delta = tx.powerUpsDelta ?? 0;
    if (input.direction === "mint" && delta > 0) total += delta;
    if (input.direction === "burn" && delta < 0) total += Math.abs(delta);
  }
  return total;
};

export const buildScannerHead = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<ScannerHead> => {
  ensureScannerBackfillStarted(input);
  const sinceMs = Date.now() - DAY_MS;
  const meta = await input.redis.hgetall(SESSION_HASH_KEY(input.hostId));
  const migration = await readScannerMigrationState(input);

  const useCache = await hasScannerHeadCache(input);
  let txsLast24h: number;
  let apuMintedLast24h: number;
  let apuBurnedLast24h: number;

  if (useCache) {
    const cache = await readScannerHeadCache(input);
    txsLast24h = cache.txsLast24h;
    apuMintedLast24h = cache.apuMintedLast24h;
    apuBurnedLast24h = cache.apuBurnedLast24h;
  } else {
    txsLast24h = await countSince(
      input.redis,
      scannerTxsKey(input.hostId),
      sinceMs
    );
    apuMintedLast24h = await sumApuFromTxs({
      redis: input.redis,
      hostId: input.hostId,
      sinceMs,
      direction: "mint",
    });
    apuBurnedLast24h = await sumApuFromTxs({
      redis: input.redis,
      hostId: input.hostId,
      sinceMs,
      direction: "burn",
    });
  }

  return ScannerHeadSchema.parse({
    generatedAt: new Date().toISOString(),
    hostId: input.hostId,
    snapshotRev: Number(meta.snapshotRev ?? 0),
    merkleRootHex: meta.merkleRootHex ?? null,
    merkleLeafCount:
      meta.merkleLeafCount !== undefined && meta.merkleLeafCount.length > 0
        ? Number(meta.merkleLeafCount)
        : null,
    sid: meta.sid ?? null,
    txsLast24h,
    apuMintedLast24h,
    apuBurnedLast24h,
    migrationStatus: migration?.status ?? "pending",
  });
};

export type ScannerTxPage = {
  readonly txs: ReadonlyArray<ScannerTxRecord>;
  readonly nextCursor: string | null;
  readonly nextSinceMs?: number | null;
};

export const listScannerTxs = async (input: {
  redis: Redis;
  hostId: string;
  limit: number;
  cursor?: string;
  sinceMs?: number;
  token?: "APU" | "USD";
}): Promise<ScannerTxPage> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);

  if (input.sinceMs !== undefined && Number.isFinite(input.sinceMs)) {
    const ids = await input.redis.zrangebyscore(
      scannerTxsKey(input.hostId),
      input.sinceMs,
      "+inf",
      "LIMIT",
      0,
      limit * 3
    );

    const txs: ScannerTxRecord[] = [];
    let nextSinceMs: number | null = null;

    for (const id of [...ids].reverse()) {
      const raw = await input.redis.get(
        `agent-play:${input.hostId}:scanner:tx:${id}`
      );
      if (raw === null) continue;
      try {
        const row = ScannerTxRecordSchema.parse(JSON.parse(raw));
        if (
          input.token === "APU" &&
          row.token !== "APU" &&
          row.powerUpsDelta === undefined
        ) {
          continue;
        }
        if (input.token === "USD" && row.priceUsd === undefined) {
          continue;
        }
        txs.push(row);
        const score = await input.redis.zscore(scannerTxsKey(input.hostId), id);
        const atMs = score !== null ? Number(score) : Date.parse(row.at);
        if (Number.isFinite(atMs)) {
          nextSinceMs =
            nextSinceMs === null ? atMs : Math.max(nextSinceMs, atMs);
        }
        if (txs.length >= limit) break;
      } catch {
        continue;
      }
    }

    return { txs, nextCursor: null, nextSinceMs };
  }

  const maxScore =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor) - 1
      : "+inf";

  const ids =
    maxScore === "+inf"
      ? await input.redis.zrevrange(scannerTxsKey(input.hostId), 0, limit * 3)
      : await input.redis.zrevrangebyscore(
          scannerTxsKey(input.hostId),
          maxScore,
          "-inf",
          "LIMIT",
          0,
          limit * 3
        );

  const txs: ScannerTxRecord[] = [];
  let nextCursor: string | null = null;

  for (const id of ids) {
    const raw = await input.redis.get(`agent-play:${input.hostId}:scanner:tx:${id}`);
    if (raw === null) continue;
    try {
      const row = ScannerTxRecordSchema.parse(JSON.parse(raw));
      if (input.token === "APU" && row.token !== "APU" && row.powerUpsDelta === undefined) {
        continue;
      }
      if (input.token === "USD" && row.priceUsd === undefined) {
        continue;
      }
      txs.push(row);
      if (txs.length >= limit) {
        const score = await input.redis.zscore(scannerTxsKey(input.hostId), id);
        nextCursor = score !== null ? String(score) : null;
        break;
      }
    } catch {
      continue;
    }
  }

  return { txs, nextCursor };
};

export const buildScannerOverview = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<{
  head: ScannerHead;
  platform: Awaited<ReturnType<typeof buildPlatformAnalyticsPayload>>;
}> => {
  const [head, platform] = await Promise.all([
    buildScannerHead(input),
    buildPlatformAnalyticsPayload(input),
  ]);
  return { head, platform };
};

const sessionHashKey = (hostId: string): string =>
  `agent-play:${hostId}:session`;

const snapshotKey = (hostId: string): string =>
  `agent-play:${hostId}:snapshot`;

export type ScannerHeadRecompute = {
  snapshotRev: number;
  storedMerkleRootHex: string | null;
  recomputedMerkleRootHex: string | null;
  merkleMatches: boolean;
  merkleLeafCount: number | null;
  generatedAt: string;
};

export const recomputeScannerHead = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<ScannerHeadRecompute> => {
  const meta = await input.redis.hgetall(sessionHashKey(input.hostId));
  const raw = await input.redis.get(snapshotKey(input.hostId));
  let recomputedMerkleRootHex: string | null = null;
  let merkleLeafCount: number | null = null;
  if (raw !== null && raw.length > 0) {
    try {
      const snapshot = JSON.parse(raw) as PreviewSnapshotJson;
      const chain = buildPlayerChainFromSnapshot(
        snapshot,
        getPlayerChainGenesisSync()
      );
      recomputedMerkleRootHex = chain.merkleRootHex;
      merkleLeafCount = chain.merkleLeafCount;
    } catch {
      recomputedMerkleRootHex = null;
      merkleLeafCount = null;
    }
  }
  const storedMerkleRootHex = meta.merkleRootHex ?? null;
  return {
    snapshotRev: Number(meta.snapshotRev ?? 0),
    storedMerkleRootHex,
    recomputedMerkleRootHex,
    merkleMatches:
      storedMerkleRootHex !== null &&
      recomputedMerkleRootHex !== null &&
      storedMerkleRootHex === recomputedMerkleRootHex,
    merkleLeafCount,
    generatedAt: new Date().toISOString(),
  };
};
