import type Redis from "ioredis";
import {
  apwPerApuRateKey,
  econextAccountScanPattern,
  marketCapCacheKey,
  marketCapSnapshotsKey,
  playerIdFromWalletKey,
  playerWalletScanPattern,
  scannerSupplyKey,
} from "./scanner-keys.js";

const MARKET_CAP_CACHE_TTL_SECONDS = 120;
const SCAN_COUNT = 200;

const matchesGlob = (key: string, pattern: string): boolean => {
  const regex = new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
  );
  return regex.test(key);
};

const scanKeys = async (input: {
  redis: Redis;
  pattern: string;
}): Promise<string[]> => {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await input.redis.scan(
      cursor,
      "MATCH",
      input.pattern,
      "COUNT",
      SCAN_COUNT,
    );
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
};

const latestSnapshotMarketCap = (
  raw: Record<string, string>,
): number | null => {
  let latestAt = -1;
  let latestCap: number | null = null;
  for (const value of Object.values(raw)) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("atMs" in parsed) ||
        !("marketCapApw" in parsed)
      ) {
        continue;
      }
      const atMs = Number((parsed as { atMs: unknown }).atMs);
      const marketCapApw = Number(
        (parsed as { marketCapApw: unknown }).marketCapApw,
      );
      if (!Number.isFinite(atMs) || !Number.isFinite(marketCapApw)) continue;
      if (marketCapApw < 0) continue;
      if (atMs >= latestAt) {
        latestAt = atMs;
        latestCap = marketCapApw;
      }
    } catch {
      continue;
    }
  }
  return latestCap;
};

const sumPlayWalletBalances = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<{ circulatingApu: number; marketUsd: number; nodeIds: Set<string> }> => {
  const keys = await scanKeys({
    redis: input.redis,
    pattern: playerWalletScanPattern(input.hostId),
  });
  const nodeIds = new Set<string>();
  let circulatingApu = 0;
  let marketUsd = 0;
  if (keys.length === 0) {
    return { circulatingApu, marketUsd, nodeIds };
  }
  const rows = await input.redis.mget(...keys);
  keys.forEach((key, index) => {
    const nodeId = playerIdFromWalletKey(key, input.hostId);
    const raw = rows[index];
    if (raw === null) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return;
      const powerUps = Number((parsed as { powerUps?: unknown }).powerUps ?? 0);
      const balanceUsd = Number(
        (parsed as { balanceUsd?: unknown }).balanceUsd ?? 0,
      );
      if (Number.isFinite(powerUps) && powerUps > 0) {
        circulatingApu += Math.trunc(powerUps);
      }
      if (Number.isFinite(balanceUsd) && balanceUsd > 0) {
        marketUsd += balanceUsd;
      }
      if (nodeId !== null) nodeIds.add(nodeId);
    } catch {
      return;
    }
  });
  return { circulatingApu, marketUsd, nodeIds };
};

const isEconextAccountKey = (key: string, hostId: string): boolean =>
  matchesGlob(key, `econext:${hostId}:account:*`) &&
  key.split(":").length === 4;

const sumUncountedBankableApu = async (input: {
  redis: Redis;
  hostId: string;
  countedNodeIds: ReadonlySet<string>;
}): Promise<number> => {
  const keys = (await scanKeys({
    redis: input.redis,
    pattern: econextAccountScanPattern(input.hostId),
  })).filter((key) => isEconextAccountKey(key, input.hostId));
  if (keys.length === 0) return 0;
  const rows = await input.redis.mget(...keys);
  let extra = 0;
  keys.forEach((key, index) => {
    const nodeId = key.slice(`econext:${input.hostId}:account:`.length);
    if (input.countedNodeIds.has(nodeId)) return;
    const raw = rows[index];
    if (raw === null) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return;
      const bankableApu = Number(
        (parsed as { bankableApu?: unknown }).bankableApu ?? 0,
      );
      if (Number.isFinite(bankableApu) && bankableApu > 0) {
        extra += Math.trunc(bankableApu);
      }
    } catch {
      return;
    }
  });
  return extra;
};

export const apwFromApu = (input: {
  apuAmount: number;
  apwPerApu: number;
}): number => {
  if (
    !Number.isFinite(input.apuAmount) ||
    input.apuAmount <= 0 ||
    !Number.isFinite(input.apwPerApu) ||
    input.apwPerApu <= 0
  ) {
    return 0;
  }
  return input.apuAmount * input.apwPerApu;
};

export const resolveApwPerApu = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<number> => {
  const raw = await input.redis.get(apwPerApuRateKey(input.hostId));
  const rate = Number(raw ?? 0);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
};

export const resolveMarketCapApw = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<number> => {
  const cached = await input.redis.get(marketCapCacheKey(input.hostId));
  const cachedNumber = Number(cached ?? Number.NaN);
  if (Number.isFinite(cachedNumber) && cachedNumber > 0) {
    return cachedNumber;
  }
  const snapshots = await input.redis.hgetall(
    marketCapSnapshotsKey(input.hostId),
  );
  const fromSnapshots = latestSnapshotMarketCap(snapshots);
  if (fromSnapshots !== null && fromSnapshots > 0) {
    return fromSnapshots;
  }
  const wallets = await sumPlayWalletBalances(input);
  if (wallets.marketUsd > 0) {
    await input.redis.set(
      marketCapCacheKey(input.hostId),
      String(wallets.marketUsd),
      "EX",
      MARKET_CAP_CACHE_TTL_SECONDS,
    );
  }
  return Math.max(0, wallets.marketUsd);
};

export const resolveCirculatingApu = async (input: {
  redis: Redis;
  hostId: string;
  cached: number;
}): Promise<number> => {
  if (input.cached > 0) return input.cached;
  const wallets = await sumPlayWalletBalances(input);
  const extra = await sumUncountedBankableApu({
    redis: input.redis,
    hostId: input.hostId,
    countedNodeIds: wallets.nodeIds,
  });
  const circulatingApu = wallets.circulatingApu + extra;
  if (circulatingApu > 0) {
    await input.redis.hset(
      scannerSupplyKey(input.hostId),
      "circulatingApu",
      String(circulatingApu),
    );
  }
  return circulatingApu;
};
