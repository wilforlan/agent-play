import type { ScannerTxRecord } from "@agent-play/sdk";
import {
  scannerGameCacheKey,
  scannerSpaceCacheKey,
  scannerTalkCacheKey,
} from "./scanner-keys.js";

export type EconomyCacheWriter = {
  hincrby: (key: string, field: string, increment: number) => unknown;
  hincrbyfloat: (key: string, field: string, increment: number) => unknown;
};

const apuFromTx = (tx: ScannerTxRecord): number => {
  if (tx.powerUpsDelta !== undefined) return Math.abs(tx.powerUpsDelta);
  if (tx.powerUpsSpent !== undefined) return tx.powerUpsSpent;
  if (tx.powerUpsEarned !== undefined) return tx.powerUpsEarned;
  return 0;
};

export const queueScannerEconomyIncrement = (
  redis: EconomyCacheWriter,
  input: {
    hostId: string;
    tx: ScannerTxRecord;
  },
): void => {
  const { hostId, tx } = input;
  const spaceKey = scannerSpaceCacheKey(hostId, tx.spaceId);
  redis.hincrby(spaceKey, "txCount", 1);
  if ((tx.priceUsd ?? 0) > 0) {
    redis.hincrbyfloat(spaceKey, "usdVolume", tx.priceUsd ?? 0);
  }
  const apu = apuFromTx(tx);
  if (apu > 0) {
    redis.hincrby(spaceKey, "apuVolume", apu);
  }
  const sol = Math.abs(tx.solLamportsDelta ?? 0);
  if (sol > 0) {
    redis.hincrby(spaceKey, "solVolume", sol);
  }

  if (tx.amenityKind === "talk_time" || tx.amenityKind === "peer_talk_time") {
    const talkKey = scannerTalkCacheKey(hostId);
    redis.hincrby(talkKey, "sessions", 1);
    if ((tx.priceUsd ?? 0) > 0) {
      redis.hincrbyfloat(talkKey, "totalChargedUsd", tx.priceUsd ?? 0);
    }
    if ((tx.powerUpsEarned ?? 0) > 0) {
      redis.hincrby(talkKey, "totalApuEarned", tx.powerUpsEarned ?? 0);
    }
  }

  if (tx.itemRef.kind === "game") {
    const gameKey = scannerGameCacheKey(hostId, tx.itemRef.id);
    redis.hincrby(gameKey, "rounds", 1);
    redis.hincrby(gameKey, "netApu", tx.powerUpsDelta ?? 0);
  }
};
