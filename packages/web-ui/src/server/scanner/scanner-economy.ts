import type Redis from "ioredis";
import { getScannerTx } from "./scanner-indexer.js";
import { scannerTxsKey } from "./scanner-keys.js";

export type ScannerGameStats = {
  readonly gameId: string;
  readonly rounds: number;
  readonly netApu: number;
};

export const buildScannerGameStats = async (input: {
  redis: Redis;
  hostId: string;
  gameId: string;
}): Promise<ScannerGameStats> => {
  const ids = await input.redis.zrevrange(scannerTxsKey(input.hostId), 0, 2000);
  let rounds = 0;
  let netApu = 0;
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx === null) continue;
    if (tx.itemRef.kind !== "game" || tx.itemRef.id !== input.gameId) continue;
    rounds += 1;
    netApu += tx.powerUpsDelta ?? 0;
  }
  return { gameId: input.gameId, rounds, netApu };
};

export const buildScannerTalkSummary = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<{
  sessions: number;
  totalChargedUsd: number;
  totalApuEarned: number;
}> => {
  const ids = await input.redis.zrevrange(scannerTxsKey(input.hostId), 0, 2000);
  let sessions = 0;
  let totalChargedUsd = 0;
  let totalApuEarned = 0;
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx === null || tx.amenityKind !== "talk_time") continue;
    sessions += 1;
    totalChargedUsd += tx.priceUsd ?? 0;
    totalApuEarned += tx.powerUpsEarned ?? 0;
  }
  return { sessions, totalChargedUsd, totalApuEarned };
};

export const buildScannerSpacesSummary = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<
  ReadonlyArray<{
    spaceId: string;
    txCount: number;
    usdVolume: number;
  }>
> => {
  const ids = await input.redis.zrevrange(scannerTxsKey(input.hostId), 0, 2000);
  const bySpace = new Map<string, { txCount: number; usdVolume: number }>();
  for (const id of ids) {
    const tx = await getScannerTx({
      redis: input.redis,
      hostId: input.hostId,
      txId: id,
    });
    if (tx === null || tx.spaceId === "__wallet__" || tx.spaceId === "__arcade__") {
      continue;
    }
    const current = bySpace.get(tx.spaceId) ?? { txCount: 0, usdVolume: 0 };
    bySpace.set(tx.spaceId, {
      txCount: current.txCount + 1,
      usdVolume: current.usdVolume + (tx.priceUsd ?? 0),
    });
  }
  return [...bySpace.entries()]
    .map(([spaceId, stats]) => ({ spaceId, ...stats }))
    .sort((a, b) => b.usdVolume - a.usdVolume);
};
