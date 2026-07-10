import type Redis from "ioredis";
import {
  AnalyticsMigrationStateSchema,
  PurchaseRecordSchema,
  type AnalyticsMigrationState,
} from "@agent-play/sdk";
import { purchaseRecordToAnalyticsEvent, sessionEventTypeToAnalyticsEvent } from "./analytics-catalog.js";
import { analyticsMigrationStateKey } from "./analytics-keys.js";
import { trackEvent } from "./analytics-tracker.js";
import {
  playerPurchasesScanPattern,
  playerIdFromPurchasesKey,
} from "../scanner/scanner-keys.js";

const SCAN_COUNT = 200;
const EVENT_LOG_KEY = (hostId: string): string =>
  `agent-play:${hostId}:session:eventlog`;

export const readAnalyticsMigrationState = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<AnalyticsMigrationState | null> => {
  const raw = await input.redis.hgetall(analyticsMigrationStateKey(input.hostId));
  if (Object.keys(raw).length === 0) return null;
  try {
    return AnalyticsMigrationStateSchema.parse({
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

export const writeAnalyticsMigrationState = async (input: {
  redis: Redis;
  hostId: string;
  state: AnalyticsMigrationState;
}): Promise<void> => {
  const row = AnalyticsMigrationStateSchema.parse(input.state);
  await input.redis.hset(analyticsMigrationStateKey(input.hostId), {
    status: row.status,
    cursor: row.cursor,
    totalIndexed: String(row.totalIndexed),
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? "",
    error: row.error ?? "",
  });
};

export const runAnalyticsBackfill = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<AnalyticsMigrationState> => {
  const startedAt = new Date().toISOString();
  let totalIndexed = 0;
  await writeAnalyticsMigrationState({
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
            const event = purchaseRecordToAnalyticsEvent({
              hostId: input.hostId,
              record,
              messageId: `backfill:purchase:${record.id}`,
              backfilled: true,
            });
            await trackEvent({
              redis: input.redis,
              hostId: input.hostId,
              event,
            });
            totalIndexed += 1;
          } catch {
            continue;
          }
        }
      }
    } while (cursor !== "0");

    const logLines = await input.redis.lrange(EVENT_LOG_KEY(input.hostId), 0, -1);
    for (let i = 0; i < logLines.length; i += 1) {
      const line = logLines[i];
      if (line === undefined) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (typeof parsed !== "object" || parsed === null) continue;
        const entry = parsed as Record<string, unknown>;
        if (typeof entry.type !== "string" || typeof entry.at !== "string") {
          continue;
        }
        const summary =
          typeof entry.summary === "string" ? entry.summary : "";
        const event = sessionEventTypeToAnalyticsEvent({
          hostId: input.hostId,
          type: entry.type,
          at: entry.at,
          summary,
          messageId: `backfill:log:${i}`,
        });
        if (event === null) continue;
        await trackEvent({
          redis: input.redis,
          hostId: input.hostId,
          event,
        });
        totalIndexed += 1;
      } catch {
        continue;
      }
    }

    const completed: AnalyticsMigrationState = {
      status: "completed",
      cursor: "done",
      totalIndexed,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await writeAnalyticsMigrationState({
      redis: input.redis,
      hostId: input.hostId,
      state: completed,
    });
    return completed;
  } catch (error) {
    const failed: AnalyticsMigrationState = {
      status: "failed",
      cursor: "error",
      totalIndexed,
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "backfill failed",
    };
    await writeAnalyticsMigrationState({
      redis: input.redis,
      hostId: input.hostId,
      state: failed,
    });
    return failed;
  }
};

export const ensureAnalyticsBackfillStarted = (input: {
  redis: Redis;
  hostId: string;
}): void => {
  void readAnalyticsMigrationState(input).then((state) => {
    if (state?.status === "completed" || state?.status === "running") return;
    void runAnalyticsBackfill(input);
  });
};
