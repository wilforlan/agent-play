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
  aggregateDailyMarketActivity,
  dailyMarketActivityKey,
  filterDailyActivitySince,
  ledgerTxsFromDay,
  parseDailyMarketActivityHash,
  sourceFromScannerTx,
  summarizeDailyActivityRows,
} from "./daily-market-activity.js";
import {
  resolveApwPerApu,
  resolveCirculatingApu,
  resolveMarketCapApw,
} from "./scanner-head-resolve.js";
import {
  p2pEscrowedApuTotalKey,
  p2pOpenOrdersKey,
  scannerSupplyKey,
  scannerTxsKey,
} from "./scanner-keys.js";

const SESSION_HASH_KEY = (hostId: string): string =>
  `agent-play:${hostId}:session`;

const DAY_MS = 24 * 60 * 60 * 1000;
const JOURNAL_ACTIVITY_FALLBACK_MAX = 200;

const sourceCountTotal = (counts: {
  amenity: number;
  arcade: number;
  talk: number;
  trade: number;
  transfer: number;
  p2p: number;
  sol: number;
}): number =>
  counts.amenity +
  counts.arcade +
  counts.talk +
  counts.trade +
  counts.transfer +
  counts.p2p +
  counts.sol;

const fillDailyActivityFromJournal = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<boolean> => {
  const { getScannerTx } = await import("./scanner-indexer.js");
  const ids = await input.redis.zrevrange(
    scannerTxsKey(input.hostId),
    0,
    JOURNAL_ACTIVITY_FALLBACK_MAX - 1,
  );
  if (ids.length === 0) return false;
  const txs: ScannerTxRecord[] = [];
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx !== null) txs.push(tx);
  }
  if (txs.length === 0) return false;
  const fields = aggregateDailyMarketActivity(txs);
  const current = await input.redis.hgetall(dailyMarketActivityKey(input.hostId));
  const patch: Record<string, string> = {};
  for (const [field, value] of Object.entries(fields)) {
    const isSolOrSource =
      field.endsWith(":volumeSolLamports") ||
      field.endsWith(":p2pVolumeSolLamports") ||
      field.endsWith(":feeSolLamports") ||
      field.includes(":source:");
    if (!isSolOrSource) continue;
    const existing = Number(current[field] ?? 0);
    if (existing > 0) continue;
    if (Number(value) <= 0) continue;
    patch[field] = value;
  }
  if (Object.keys(patch).length === 0) return false;
  for (const [field, value] of Object.entries(patch)) {
    await input.redis.hset(
      dailyMarketActivityKey(input.hostId),
      field,
      value,
    );
  }
  return true;
};

const utcDayStartMs = (nowMs: number): number => {
  const dayKey = new Date(nowMs).toISOString().slice(0, 10);
  return Date.parse(`${dayKey}T00:00:00.000Z`);
};

export const buildScannerHead = async (input: {
  redis: Redis;
  hostId: string;
  nowMs?: number;
}): Promise<ScannerHead> => {
  ensureScannerBackfillStarted(input);
  const nowMs = input.nowMs ?? Date.now();
  const todayStartMs = utcDayStartMs(nowMs);
  const meta = await input.redis.hgetall(SESSION_HASH_KEY(input.hostId));
  const migration = await readScannerMigrationState(input);
  const [txsAllTime, supply, escrowRaw, openOrders, marketCapApw, apwPerApu, raw] =
    await Promise.all([
      input.redis.zcard(scannerTxsKey(input.hostId)),
      input.redis.hgetall(scannerSupplyKey(input.hostId)),
      input.redis.get(p2pEscrowedApuTotalKey(input.hostId)),
      input.redis.zcard(p2pOpenOrdersKey(input.hostId)),
      resolveMarketCapApw({ redis: input.redis, hostId: input.hostId }),
      resolveApwPerApu({ redis: input.redis, hostId: input.hostId }),
      input.redis.hgetall(dailyMarketActivityKey(input.hostId)),
    ]);
  let activityRaw = raw;
  let rows = parseDailyMarketActivityHash({
    raw: activityRaw,
    sinceMs: nowMs - 5 * 366 * DAY_MS,
  });
  let preview = summarizeDailyActivityRows(rows);
  const needsJournalFallback =
    txsAllTime > 0 &&
    txsAllTime <= JOURNAL_ACTIVITY_FALLBACK_MAX &&
    (preview.volumeSolLamports === 0 ||
      sourceCountTotal(preview.sourceCounts) === 0);
  if (needsJournalFallback) {
    const filled = await fillDailyActivityFromJournal({
      redis: input.redis,
      hostId: input.hostId,
    });
    if (filled) {
      activityRaw = await input.redis.hgetall(
        dailyMarketActivityKey(input.hostId),
      );
      rows = parseDailyMarketActivityHash({
        raw: activityRaw,
        sinceMs: nowMs - 5 * 366 * DAY_MS,
      });
    }
  }
  const summarizeSince = (sinceMs: number) =>
    summarizeDailyActivityRows(
      filterDailyActivitySince({ rows, sinceMs, untilMs: nowMs }),
    );
  const today = summarizeSince(todayStartMs);
  const last24h = summarizeDailyActivityRows(
    filterDailyActivitySince({
      rows,
      sinceMs: todayStartMs - DAY_MS,
      untilMs: nowMs,
    }),
  );
  const last7d = summarizeSince(nowMs - 7 * DAY_MS);
  const last30d = summarizeSince(nowMs - 30 * DAY_MS);
  const last90d = summarizeSince(nowMs - 90 * DAY_MS);
  const last6mo = summarizeSince(nowMs - 182 * DAY_MS);
  const last1y = summarizeSince(nowMs - 365 * DAY_MS);
  const last5y = summarizeSince(nowMs - 5 * 366 * DAY_MS);
  const circulatingApu = await resolveCirculatingApu({
    redis: input.redis,
    hostId: input.hostId,
    cached: Math.max(0, Number(supply.circulatingApu ?? 0)),
  });

  return ScannerHeadSchema.parse({
    generatedAt: new Date(nowMs).toISOString(),
    hostId: input.hostId,
    snapshotRev: Number(meta.snapshotRev ?? 0),
    merkleRootHex: meta.merkleRootHex ?? null,
    merkleLeafCount:
      meta.merkleLeafCount !== undefined && meta.merkleLeafCount.length > 0
        ? Number(meta.merkleLeafCount)
        : null,
    sid: meta.sid ?? null,
    txsLast24h: ledgerTxsFromDay(last24h),
    apuMintedLast24h: last24h.apuMinted,
    apuBurnedLast24h: last24h.apuBurned,
    migrationStatus: migration?.status ?? "pending",
    txsToday: ledgerTxsFromDay(today),
    txs7d: ledgerTxsFromDay(last7d),
    txs30d: ledgerTxsFromDay(last30d),
    txs90d: ledgerTxsFromDay(last90d),
    txs6mo: ledgerTxsFromDay(last6mo),
    txs1y: ledgerTxsFromDay(last1y),
    txs5y: ledgerTxsFromDay(last5y),
    txsAllTime,
    volumeApuToday: today.volumeApu,
    volumeApu7d: last7d.volumeApu,
    volumeApu30d: last30d.volumeApu,
    volumeApu90d: last90d.volumeApu,
    volumeApu6mo: last6mo.volumeApu,
    volumeApu1y: last1y.volumeApu,
    volumeApu5y: last5y.volumeApu,
    volumeSolToday: today.volumeSolLamports,
    volumeSol7d: last7d.volumeSolLamports,
    volumeSol30d: last30d.volumeSolLamports,
    volumeSol90d: last90d.volumeSolLamports,
    volumeSol6mo: last6mo.volumeSolLamports,
    volumeSol1y: last1y.volumeSolLamports,
    volumeSol5y: last5y.volumeSolLamports,
    p2pSettlements7d: last7d.p2pDealCount,
    p2pVolumeSol7d: last7d.p2pVolumeSolLamports,
    feeSol7d: last7d.feeSolLamports,
    marketCapApw,
    circulatingApu,
    escrowedApu: Math.max(0, Number(escrowRaw ?? 0)),
    openP2pOrders: openOrders,
    apwPerApu,
    bySource: last7d.sourceCounts,
    bySourceToday: today.sourceCounts,
    bySource7d: last7d.sourceCounts,
    bySource30d: last30d.sourceCounts,
    bySource90d: last90d.sourceCounts,
    bySource6mo: last6mo.sourceCounts,
    bySource1y: last1y.sourceCounts,
    bySource5y: last5y.sourceCounts,
  });
};

export type ScannerTxPage = {
  readonly txs: ReadonlyArray<ScannerTxRecord>;
  readonly nextCursor: string | null;
  readonly nextSinceMs?: number | null;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pageCount: number;
};

export type ScannerTxTokenFilter = "APU" | "USD" | "SOL";
export type ScannerTxSourceFilter = "p2p" | "transfer" | "trade" | "sol";

const matchesScannerTxFilters = (input: {
  row: ScannerTxRecord;
  token?: ScannerTxTokenFilter;
  source?: ScannerTxSourceFilter;
}): boolean => {
  if (input.token === "APU") {
    if (input.row.token !== "APU" && input.row.powerUpsDelta === undefined) {
      return false;
    }
  }
  if (input.token === "USD" && input.row.priceUsd === undefined) {
    return false;
  }
  if (input.token === "SOL") {
    const hasSol =
      input.row.token === "SOL" ||
      input.row.solLamportsDelta !== undefined ||
      input.row.amenityKind === "sol_deposit" ||
      input.row.amenityKind === "sol_payout";
    if (!hasSol) return false;
  }
  if (input.source !== undefined) {
    return sourceFromScannerTx(input.row) === input.source;
  }
  return true;
};

const paginationMeta = (input: {
  page: number;
  pageSize: number;
  total: number;
}): Pick<ScannerTxPage, "page" | "pageSize" | "total" | "pageCount"> => {
  const pageCount = input.total === 0 ? 0 : Math.ceil(input.total / input.pageSize);
  const page =
    pageCount === 0 ? 1 : Math.min(Math.max(1, input.page), pageCount);
  return {
    page,
    pageSize: input.pageSize,
    total: input.total,
    pageCount,
  };
};

const readScannerTxRow = async (input: {
  redis: Redis;
  hostId: string;
  txId: string;
}): Promise<ScannerTxRecord | null> => {
  const { getScannerTx } = await import("./scanner-indexer.js");
  return getScannerTx(input);
};

export const listScannerTxs = async (input: {
  redis: Redis;
  hostId: string;
  limit: number;
  cursor?: string;
  page?: number;
  sinceMs?: number;
  token?: ScannerTxTokenFilter;
  source?: ScannerTxSourceFilter;
}): Promise<ScannerTxPage> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const requestedPage = Math.max(1, Math.trunc(input.page ?? 1));
  const filtered = input.token !== undefined || input.source !== undefined;
  const candidateLimit = limit * 8;

  if (input.sinceMs !== undefined && Number.isFinite(input.sinceMs)) {
    const ids = await input.redis.zrangebyscore(
      scannerTxsKey(input.hostId),
      input.sinceMs,
      "+inf",
      "LIMIT",
      0,
      candidateLimit
    );

    const txs: ScannerTxRecord[] = [];
    let nextSinceMs: number | null = null;

    for (const id of [...ids].reverse()) {
      const row = await readScannerTxRow({
        redis: input.redis,
        hostId: input.hostId,
        txId: id,
      });
      if (row === null) continue;
      if (!matchesScannerTxFilters({ row, token: input.token, source: input.source })) {
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
    }

    return {
      txs,
      nextCursor: null,
      nextSinceMs,
      ...paginationMeta({ page: 1, pageSize: limit, total: txs.length }),
    };
  }

  if (!filtered && (input.cursor === undefined || input.cursor.length === 0)) {
    const total = await input.redis.zcard(scannerTxsKey(input.hostId));
    const meta = paginationMeta({
      page: requestedPage,
      pageSize: limit,
      total,
    });
    const start = (meta.page - 1) * limit;
    const ids = await input.redis.zrevrange(
      scannerTxsKey(input.hostId),
      start,
      start + limit - 1
    );
    const txs: ScannerTxRecord[] = [];
    for (const id of ids) {
      const row = await readScannerTxRow({
        redis: input.redis,
        hostId: input.hostId,
        txId: id,
      });
      if (row !== null) txs.push(row);
    }
    const lastId = ids[ids.length - 1];
    const nextCursor =
      meta.page < meta.pageCount && lastId !== undefined
        ? await input.redis.zscore(scannerTxsKey(input.hostId), lastId)
        : null;
    return { txs, nextCursor, ...meta };
  }

  if (filtered && (input.cursor === undefined || input.cursor.length === 0)) {
    const scanSize = 200;
    let offset = 0;
    let matched = 0;
    const skip = (requestedPage - 1) * limit;
    const txs: ScannerTxRecord[] = [];
    while (true) {
      const ids = await input.redis.zrevrange(
        scannerTxsKey(input.hostId),
        offset,
        offset + scanSize - 1
      );
      if (ids.length === 0) break;
      for (const id of ids) {
        const row = await readScannerTxRow({
          redis: input.redis,
          hostId: input.hostId,
          txId: id,
        });
        if (row === null) continue;
        if (!matchesScannerTxFilters({ row, token: input.token, source: input.source })) {
          continue;
        }
        if (matched >= skip && txs.length < limit) {
          txs.push(row);
        }
        matched += 1;
      }
      if (ids.length < scanSize) break;
      offset += ids.length;
    }
    const meta = paginationMeta({
      page: requestedPage,
      pageSize: limit,
      total: matched,
    });
    const last = txs[txs.length - 1];
    const nextCursor =
      meta.page < meta.pageCount && last !== undefined
        ? await input.redis.zscore(scannerTxsKey(input.hostId), last.id)
        : null;
    return { txs, nextCursor, ...meta };
  }

  const maxScore =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor) - 1
      : "+inf";

  const ids =
    maxScore === "+inf"
      ? await input.redis.zrevrange(scannerTxsKey(input.hostId), 0, candidateLimit)
      : await input.redis.zrevrangebyscore(
          scannerTxsKey(input.hostId),
          maxScore,
          "-inf",
          "LIMIT",
          0,
          candidateLimit
        );

  const txs: ScannerTxRecord[] = [];
  let nextCursor: string | null = null;

  for (const id of ids) {
    const row = await readScannerTxRow({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (row === null) continue;
    if (!matchesScannerTxFilters({ row, token: input.token, source: input.source })) {
      continue;
    }
    txs.push(row);
    if (txs.length >= limit) {
      const score = await input.redis.zscore(scannerTxsKey(input.hostId), id);
      nextCursor = score !== null ? String(score) : null;
      break;
    }
  }

  return {
    txs,
    nextCursor,
    ...paginationMeta({
      page: requestedPage,
      pageSize: limit,
      total: txs.length,
    }),
  };
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
