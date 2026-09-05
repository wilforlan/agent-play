import type Redis from "ioredis";
import {
  scannerGameCacheKey,
  scannerGameScanPattern,
  scannerSpaceScanPattern,
  scannerTalkCacheKey,
} from "./scanner-keys.js";

export type ScannerGameStats = {
  readonly gameId: string;
  readonly rounds: number;
  readonly netApu: number;
};

const SCAN_COUNT = 200;

const scanKeys = async (redis: Redis, pattern: string): Promise<string[]> => {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      SCAN_COUNT
    );
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
};

export const buildScannerGameStats = async (input: {
  redis: Redis;
  hostId: string;
  gameId: string;
}): Promise<ScannerGameStats> => {
  const raw = await input.redis.hgetall(
    scannerGameCacheKey(input.hostId, input.gameId)
  );
  return {
    gameId: input.gameId,
    rounds: Number(raw.rounds ?? 0),
    netApu: Number(raw.netApu ?? 0),
  };
};

export const buildScannerTalkSummary = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<{
  sessions: number;
  totalChargedUsd: number;
  totalApuEarned: number;
}> => {
  const raw = await input.redis.hgetall(scannerTalkCacheKey(input.hostId));
  return {
    sessions: Number(raw.sessions ?? 0),
    totalChargedUsd: Number(raw.totalChargedUsd ?? 0),
    totalApuEarned: Number(raw.totalApuEarned ?? 0),
  };
};

export const buildScannerSpacesSummary = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<
  ReadonlyArray<{
    spaceId: string;
    txCount: number;
    usdVolume: number;
    apuVolume: number;
    solVolume: number;
  }>
> => {
  const keys = await scanKeys(
    input.redis,
    scannerSpaceScanPattern(input.hostId)
  );
  const prefix = `agent-play:${input.hostId}:scanner:cache:space:`;
  const spaces: Array<{
    spaceId: string;
    txCount: number;
    usdVolume: number;
    apuVolume: number;
    solVolume: number;
  }> = [];
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const spaceId = key.slice(prefix.length);
    if (spaceId === "__wallet__" || spaceId === "__arcade__") continue;
    const raw = await input.redis.hgetall(key);
    spaces.push({
      spaceId,
      txCount: Number(raw.txCount ?? 0),
      usdVolume: Number(raw.usdVolume ?? 0),
      apuVolume: Number(raw.apuVolume ?? 0),
      solVolume: Number(raw.solVolume ?? 0),
    });
  }
  return spaces.sort((a, b) => b.usdVolume - a.usdVolume);
};

export const listScannerGameIds = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<readonly string[]> => {
  const keys = await scanKeys(input.redis, scannerGameScanPattern(input.hostId));
  const prefix = `agent-play:${input.hostId}:scanner:cache:game:`;
  return keys
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
};
