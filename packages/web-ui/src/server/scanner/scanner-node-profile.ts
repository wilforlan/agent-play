import type Redis from "ioredis";
import {
  GameStatsSchema,
  PlayerWalletSchema,
  ScannerNodeProfileSchema,
  ScannerTxRecordSchema,
  type ScannerTxRecord,
} from "@agent-play/sdk";
import {
  sanitizeAnalyticsEventForPublic,
  sanitizeTraitsForPublic,
} from "../analytics/analytics-payload.js";
import {
  analyticsByUserKey,
  analyticsTraitsKey,
} from "../analytics/analytics-keys.js";
import { getAnalyticsEvent } from "../analytics/analytics-tracker.js";
import { getScannerTx } from "./scanner-indexer.js";
import { apwFromApu, resolveApwPerApu } from "./scanner-head-resolve.js";
import {
  econextAccountKey,
  playerWalletKey,
  scannerTxByPlayerKey,
  scannerWalletKey,
} from "./scanner-keys.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const detectNodeKind = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<"main" | "agent" | "unknown"> => {
  const mainAuthKey = `agent-play:${input.hostId}:${input.nodeId}:main-auth`;
  const mainExists = await input.redis.exists(mainAuthKey);
  if (mainExists > 0) return "main";

  const agentPattern = `agent-play:${input.hostId}:node:*:auth:agent-node:${input.nodeId}`;
  let cursor = "0";
  do {
    const [next, keys] = await input.redis.scan(
      cursor,
      "MATCH",
      agentPattern,
      "COUNT",
      50
    );
    cursor = next;
    if (keys.length > 0) return "agent";
  } while (cursor !== "0");

  return "unknown";
};

const aggregateBreakdown = (
  txs: ReadonlyArray<ScannerTxRecord>
): {
  byAmenityKind: Record<string, number>;
  bySpaceId: Record<string, number>;
  byToken: { usd: number; apu: number };
} => {
  const byAmenityKind: Record<string, number> = {};
  const bySpaceId: Record<string, number> = {};
  let usd = 0;
  let apu = 0;

  for (const tx of txs) {
    byAmenityKind[tx.amenityKind] = (byAmenityKind[tx.amenityKind] ?? 0) + 1;
    bySpaceId[tx.spaceId] = (bySpaceId[tx.spaceId] ?? 0) + 1;
    usd += tx.priceUsd ?? 0;
    const delta = tx.powerUpsDelta ?? 0;
    if (delta > 0) apu += delta;
    if (delta < 0) apu += Math.abs(delta);
  }

  return { byAmenityKind, bySpaceId, byToken: { usd, apu } };
};

const aggregateLedgerFromTxs = (
  txs: ReadonlyArray<ScannerTxRecord>
): {
  txCount: number;
  usdSpent: number;
  apuMinted: number;
  apuBurned: number;
  apuTransacted: number;
  lastTxAt: string | null;
} => {
  let usdSpent = 0;
  let apuMinted = 0;
  let apuBurned = 0;
  let apuTransacted = 0;
  let lastTxAt: string | null = null;

  for (const tx of txs) {
    usdSpent += tx.priceUsd ?? 0;
    const delta = tx.powerUpsDelta ?? 0;
    if (delta > 0) apuMinted += delta;
    if (delta < 0) apuBurned += Math.abs(delta);
    apuTransacted += Math.abs(delta);
    if (lastTxAt === null || Date.parse(tx.at) > Date.parse(lastTxAt)) {
      lastTxAt = tx.at;
    }
  }

  return {
    txCount: txs.length,
    usdSpent,
    apuMinted,
    apuBurned,
    apuTransacted,
    lastTxAt,
  };
};

export const listScannerNodeTxs = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
  limit: number;
  cursor?: string;
  page?: number;
}): Promise<{
  txs: ScannerTxRecord[];
  nextCursor: string | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}> => {
  const empty = {
    txs: [] as ScannerTxRecord[],
    nextCursor: null,
    page: 1,
    pageSize: 0,
    total: 0,
    pageCount: 0,
  };
  if (input.limit <= 0) return empty;
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const key = scannerTxByPlayerKey(input.hostId, input.nodeId);
  const total = await input.redis.zcard(key);
  const pageCount = total === 0 ? 0 : Math.ceil(total / limit);
  const page =
    pageCount === 0
      ? 1
      : Math.min(Math.max(1, Math.trunc(input.page ?? 1)), pageCount);

  const ids =
    input.cursor !== undefined && input.cursor.length > 0
      ? await input.redis.zrevrangebyscore(
          key,
          Number(input.cursor) - 1,
          "-inf",
          "LIMIT",
          0,
          limit
        )
      : await input.redis.zrevrange(key, (page - 1) * limit, page * limit - 1);

  const txs: ScannerTxRecord[] = [];
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx !== null) txs.push(tx);
  }

  const lastId = ids[ids.length - 1];
  const nextCursor =
    lastId !== undefined && page < pageCount
      ? String(await input.redis.zscore(key, lastId))
      : null;

  return { txs, nextCursor, page, pageSize: limit, total, pageCount };
};

const listNodeAnalyticsEvents = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
  limit: number;
  cursor?: string;
}): Promise<{
  events: ReturnType<typeof sanitizeAnalyticsEventForPublic>[];
  nextCursor: string | null;
}> => {
  if (input.limit <= 0) return { events: [], nextCursor: null };
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const maxScore =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor) - 1
      : "+inf";

  const ids = await input.redis.zrevrangebyscore(
    analyticsByUserKey(input.hostId, input.nodeId),
    maxScore,
    "-inf",
    "LIMIT",
    0,
    limit
  );

  const events = [];
  for (const messageId of ids) {
    const event = await getAnalyticsEvent({
      redis: input.redis,
      hostId: input.hostId,
      messageId,
    });
    if (event !== null) events.push(sanitizeAnalyticsEventForPublic(event));
  }

  const lastId = ids[ids.length - 1];
  const nextCursor =
    lastId !== undefined
      ? String(
          await input.redis.zscore(
            analyticsByUserKey(input.hostId, input.nodeId),
            lastId
          )
        )
      : null;

  return { events, nextCursor };
};

const countNodeEventsLast24h = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<number> => {
  const sinceMs = Date.now() - DAY_MS;
  const ids = await input.redis.zrangebyscore(
    analyticsByUserKey(input.hostId, input.nodeId),
    sinceMs,
    "+inf"
  );
  return ids.length;
};

const countNodeEventsByName = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
  limit?: number;
}): Promise<Array<{ event: string; count: number }>> => {
  const ids = await input.redis.zrevrange(
    analyticsByUserKey(input.hostId, input.nodeId),
    0,
    500
  );
  const counts = new Map<string, number>();
  for (const messageId of ids) {
    const event = await getAnalyticsEvent({
      redis: input.redis,
      hostId: input.hostId,
      messageId,
    });
    if (event === null) continue;
    counts.set(event.event, (counts.get(event.event) ?? 0) + 1);
  }
  const topEvents = [...counts.entries()]
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);
  return topEvents.slice(0, input.limit ?? 10);
};

const resolveNodeWallet = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<{
  balanceUsd: number;
  powerUps: number;
  currency: "USD";
  updatedAt: string;
} | null> => {
  const scannerRaw = await input.redis.get(
    scannerWalletKey(input.hostId, input.nodeId),
  );
  if (scannerRaw !== null) {
    try {
      const parsed = PlayerWalletSchema.parse(JSON.parse(scannerRaw));
      return {
        balanceUsd: parsed.balanceUsd,
        powerUps: parsed.powerUps,
        currency: parsed.currency,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      // Fall through to Play / Econext wallets.
    }
  }
  const playRaw = await input.redis.get(
    playerWalletKey(input.hostId, input.nodeId),
  );
  if (playRaw !== null) {
    try {
      const parsed = PlayerWalletSchema.parse(JSON.parse(playRaw));
      return {
        balanceUsd: parsed.balanceUsd,
        powerUps: parsed.powerUps,
        currency: parsed.currency,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      // Fall through to Econext account.
    }
  }
  const accountRaw = await input.redis.get(
    econextAccountKey(input.hostId, input.nodeId),
  );
  if (accountRaw === null) return null;
  try {
    const parsed: unknown = JSON.parse(accountRaw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const bankableApu = Number(
      "bankableApu" in parsed ? parsed.bankableApu : 0,
    );
    if (!Number.isFinite(bankableApu) || bankableApu <= 0) return null;
    return {
      balanceUsd: 0,
      powerUps: Math.trunc(bankableApu),
      currency: "USD",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const nodeProfileExists = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<boolean> => {
  const walletExists = await input.redis.exists(
    scannerWalletKey(input.hostId, input.nodeId)
  );
  if (walletExists > 0) return true;

  const playWalletExists = await input.redis.exists(
    playerWalletKey(input.hostId, input.nodeId)
  );
  if (playWalletExists > 0) return true;

  const accountExists = await input.redis.exists(
    econextAccountKey(input.hostId, input.nodeId)
  );
  if (accountExists > 0) return true;

  const txCount = await input.redis.zcard(
    scannerTxByPlayerKey(input.hostId, input.nodeId)
  );
  if (txCount > 0) return true;

  const eventCount = await input.redis.zcard(
    analyticsByUserKey(input.hostId, input.nodeId)
  );
  if (eventCount > 0) return true;

  const mainAuthExists = await input.redis.exists(
    `agent-play:${input.hostId}:${input.nodeId}:main-auth`
  );
  if (mainAuthExists > 0) return true;

  const kind = await detectNodeKind(input);
  return kind === "agent";
};

export const buildScannerNodeProfile = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
  txLimit?: number;
  txCursor?: string;
  txPage?: number;
  eventLimit?: number;
  eventCursor?: string;
}) => {
  const exists = await nodeProfileExists(input);
  if (!exists) return null;

  const kind = await detectNodeKind(input);

  const wallet = await resolveNodeWallet(input);

  const txPage = await listScannerNodeTxs({
    redis: input.redis,
    hostId: input.hostId,
    nodeId: input.nodeId,
    limit: input.txLimit ?? 25,
    cursor: input.txCursor,
    page: input.txPage,
  });
  const allTxPage = await listScannerNodeTxs({
    redis: input.redis,
    hostId: input.hostId,
    nodeId: input.nodeId,
    limit: 100,
    page: 1,
  });
  const allTxs: ScannerTxRecord[] = [...allTxPage.txs];
  if (allTxPage.pageCount > 1) {
    for (let page = 2; page <= allTxPage.pageCount; page += 1) {
      const next = await listScannerNodeTxs({
        redis: input.redis,
        hostId: input.hostId,
        nodeId: input.nodeId,
        limit: 100,
        page,
      });
      allTxs.push(...next.txs);
    }
  }
  const ledgerBase = aggregateLedgerFromTxs(allTxs);
  const apwPerApu = await resolveApwPerApu({
    redis: input.redis,
    hostId: input.hostId,
  });
  const ledger = {
    ...ledgerBase,
    apwVolume: apwFromApu({
      apuAmount: ledgerBase.apuTransacted,
      apwPerApu,
    }),
  };

  const breakdown = aggregateBreakdown(txPage.txs);

  const gameRaw = await input.redis.get(
    `agent-play:${input.hostId}:player:${input.nodeId}:game-state`
  );
  let gameStats = null;
  if (gameRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(gameRaw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "stats" in parsed
      ) {
        gameStats = GameStatsSchema.parse(
          (parsed as { stats: unknown }).stats
        );
      }
    } catch {
      gameStats = null;
    }
  }

  const eventPage = await listNodeAnalyticsEvents({
    redis: input.redis,
    hostId: input.hostId,
    nodeId: input.nodeId,
    limit: input.eventLimit ?? 25,
    cursor: input.eventCursor,
  });

  const traitsRaw = await input.redis.hgetall(
    analyticsTraitsKey(input.hostId, input.nodeId)
  );
  const traits = sanitizeTraitsForPublic(traitsRaw);

  const eventsLast24h = await countNodeEventsLast24h(input);
  const topEvents = await countNodeEventsByName(input);

  return ScannerNodeProfileSchema.parse({
    nodeId: input.nodeId,
    kind,
    generatedAt: new Date().toISOString(),
    wallet,
    ledger,
    breakdown,
    txs: txPage.txs.map((tx) => ScannerTxRecordSchema.parse(tx)),
    txsNextCursor: txPage.nextCursor,
    gameStats,
    analyticsEvents: eventPage.events,
    analyticsEventsNextCursor: eventPage.nextCursor,
    analytics: { eventsLast24h, topEvents },
    traits,
  });
};
