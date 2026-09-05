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

const purchaseFromHistoricalLedger = (
  entry: {
    id?: string;
    nodeId?: string;
    kind?: string;
    at?: string;
    apuDelta?: number;
    solLamportsDelta?: number;
    detail?: string;
    solanaTxSignature?: string;
    referenceId?: string;
  },
): ReturnType<typeof PurchaseRecordSchema.parse> | null => {
  if (entry.id === undefined || entry.nodeId === undefined || entry.at === undefined) {
    return null;
  }
  if (entry.kind === "sol_deposit") {
    return PurchaseRecordSchema.parse({
      id: entry.id,
      playerId: entry.nodeId,
      spaceId: "econext",
      amenityKind: "sol_deposit",
      itemRef: { kind: "sol", id: entry.solanaTxSignature ?? entry.id },
      at: entry.at,
      detail: entry.detail,
      solLamportsDelta: entry.solLamportsDelta,
      solanaTxSignature: entry.solanaTxSignature,
      creditSource: "econext:sol_deposit",
      token: "SOL",
    });
  }
  if (entry.kind === "sol_payout") {
    return PurchaseRecordSchema.parse({
      id: entry.id,
      playerId: entry.nodeId,
      spaceId: "econext",
      amenityKind: "sol_payout",
      itemRef: { kind: "sol", id: entry.solanaTxSignature ?? entry.id },
      at: entry.at,
      detail: entry.detail,
      solLamportsDelta: entry.solLamportsDelta,
      solanaTxSignature: entry.solanaTxSignature,
      creditSource: "econext:sol_payout",
      token: "SOL",
    });
  }
  if (entry.kind === "apu_convert_out") {
    return PurchaseRecordSchema.parse({
      id: entry.id,
      playerId: entry.nodeId,
      spaceId: "econext",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: entry.id },
      at: entry.at,
      detail: entry.detail,
      powerUpsDelta: entry.apuDelta,
      solLamportsDelta: entry.solLamportsDelta,
      creditSource: "econext:convert",
      token: "APU",
    });
  }
  if (entry.kind === "p2p_settle_out") {
    return PurchaseRecordSchema.parse({
      id: entry.id,
      playerId: entry.nodeId,
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: entry.referenceId ?? entry.id },
      at: entry.at,
      detail: entry.detail,
      powerUpsDelta: entry.apuDelta,
      solLamportsDelta: entry.solLamportsDelta,
      creditSource: "econext:p2p",
      token: "APU",
    });
  }
  if (entry.kind === "p2p_settle_in") {
    return PurchaseRecordSchema.parse({
      id: entry.id,
      playerId: entry.nodeId,
      spaceId: "econext-p2p",
      amenityKind: "apu_credit",
      itemRef: { kind: "apu", id: entry.referenceId ?? entry.id },
      at: entry.at,
      detail: entry.detail,
      powerUpsDelta: entry.apuDelta,
      solLamportsDelta: entry.solLamportsDelta,
      creditSource: "econext:p2p",
      token: "APU",
    });
  }
  return null;
};

export const purchaseFromHistoricalLedgerEntry = purchaseFromHistoricalLedger;

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
        `econext:${input.hostId}:account:*:ledger`,
        "COUNT",
        SCAN_COUNT
      );
      cursor = next;
      for (const key of keys) {
        const lines = await input.redis.lrange(key, 0, -1);
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as {
              id?: string;
              nodeId?: string;
              kind?: string;
              at?: string;
              apuDelta?: number;
              solLamportsDelta?: number;
              detail?: string;
              solanaTxSignature?: string;
              referenceId?: string;
            };
            const record = purchaseFromHistoricalLedger(entry);
            if (record === null) continue;
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

    const { rebuildScannerCacheFromIndexes } = await import("./scanner-cache.js");
    await rebuildScannerCacheFromIndexes(input);

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
