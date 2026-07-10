import type Redis from "ioredis";
import {
  PlayerWalletSchema,
  PurchaseRecordSchema,
  ScannerMigrationStateSchema,
  type ScannerMigrationState,
} from "@agent-play/sdk";
import {
  indexPurchaseRecord,
  indexWalletBalance,
} from "./scanner-indexer.js";
import {
  playerIdFromPurchasesKey,
  playerIdFromWalletKey,
  playerPurchasesScanPattern,
  playerWalletScanPattern,
  scannerMigrationStateKey,
} from "./scanner-keys.js";

const SCAN_COUNT = 200;

export const readScannerMigrationState = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<ScannerMigrationState | null> => {
  const raw = await input.redis.hgetall(scannerMigrationStateKey(input.hostId));
  if (Object.keys(raw).length === 0) return null;
  try {
    return ScannerMigrationStateSchema.parse({
      status: raw.status,
      cursor: raw.cursor ?? "",
      totalIndexed: Number(raw.totalIndexed ?? 0),
      startedAt: raw.startedAt,
      completedAt: raw.completedAt,
      error: raw.error,
    });
  } catch {
    return null;
  }
};

export const writeScannerMigrationState = async (input: {
  redis: Redis;
  hostId: string;
  state: ScannerMigrationState;
}): Promise<void> => {
  const row = ScannerMigrationStateSchema.parse(input.state);
  await input.redis.hset(scannerMigrationStateKey(input.hostId), {
    status: row.status,
    cursor: row.cursor,
    totalIndexed: String(row.totalIndexed),
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? "",
    error: row.error ?? "",
  });
};

export const runScannerBackfill = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<ScannerMigrationState> => {
  const startedAt = new Date().toISOString();
  let totalIndexed = 0;
  await writeScannerMigrationState({
    redis: input.redis,
    hostId: input.hostId,
    state: {
      status: "running",
      cursor: "purchases",
      totalIndexed: 0,
      startedAt,
    },
  });

  try {
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
            await indexPurchaseRecord({
              redis: input.redis,
              hostId: input.hostId,
              record,
            });
            totalIndexed += 1;
          } catch {
            continue;
          }
        }
      }
    } while (cursor !== "0");

    cursor = "0";
    do {
      const [next, keys] = await input.redis.scan(
        cursor,
        "MATCH",
        playerWalletScanPattern(input.hostId),
        "COUNT",
        SCAN_COUNT
      );
      cursor = next;
      for (const key of keys) {
        const playerId = playerIdFromWalletKey(key, input.hostId);
        if (playerId === null) continue;
        const raw = await input.redis.get(key);
        if (raw === null) continue;
        try {
          const wallet = PlayerWalletSchema.parse(JSON.parse(raw));
          await indexWalletBalance({
            redis: input.redis,
            hostId: input.hostId,
            wallet: {
              playerId: wallet.playerId,
              balanceUsd: wallet.balanceUsd,
              powerUps: wallet.powerUps,
              updatedAt: wallet.updatedAt,
            },
          });
        } catch {
          continue;
        }
      }
    } while (cursor !== "0");

    const completed: ScannerMigrationState = {
      status: "completed",
      cursor: "done",
      totalIndexed,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await writeScannerMigrationState({
      redis: input.redis,
      hostId: input.hostId,
      state: completed,
    });
    return completed;
  } catch (error) {
    const failed: ScannerMigrationState = {
      status: "failed",
      cursor: "error",
      totalIndexed,
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "backfill failed",
    };
    await writeScannerMigrationState({
      redis: input.redis,
      hostId: input.hostId,
      state: failed,
    });
    return failed;
  }
};

export const ensureScannerBackfillStarted = (input: {
  redis: Redis;
  hostId: string;
}): void => {
  void readScannerMigrationState(input).then((state) => {
    if (state?.status === "completed" || state?.status === "running") return;
    void runScannerBackfill(input);
  });
};
