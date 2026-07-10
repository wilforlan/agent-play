import type Redis from "ioredis";
import { analyticsKeyPrefix } from "./analytics-keys.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const analyticsOverviewCacheKey = (hostId: string): string =>
  `${analyticsKeyPrefix(hostId)}:cache:overview`;

const formatHourBucket = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}-${h}`;
};

export const analyticsEventsHourKey = (hostId: string, date: Date): string =>
  `${analyticsKeyPrefix(hostId)}:cache:events:hour:${formatHourBucket(date)}`;

const hourBucketDates = (nowMs: number): Date[] => {
  const dates: Date[] = [];
  const base = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  for (let i = 0; i < 24; i += 1) {
    dates.push(new Date(base - i * HOUR_MS));
  }
  return dates;
};

export type AnalyticsOverviewCache = {
  eventsLast24h: number;
  lastStreamId: string | null;
};

export const readAnalyticsOverviewCache = async (input: {
  redis: Redis;
  hostId: string;
  nowMs?: number;
}): Promise<AnalyticsOverviewCache> => {
  const nowMs = input.nowMs ?? Date.now();
  const hours = hourBucketDates(nowMs);
  const keys = hours.map((d) => analyticsEventsHourKey(input.hostId, d));

  let eventsLast24h = 0;
  for (const key of keys) {
    const raw = await input.redis.get(key);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) eventsLast24h += n;
  }

  const overview = await input.redis.hgetall(
    analyticsOverviewCacheKey(input.hostId)
  );
  const lastStreamId = overview.lastStreamId ?? null;

  return { eventsLast24h, lastStreamId };
};

export const hasAnalyticsOverviewCache = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<boolean> => {
  const overview = await input.redis.hgetall(
    analyticsOverviewCacheKey(input.hostId)
  );
  return Object.keys(overview).length > 0;
};

export const bumpAnalyticsOverviewOnEvent = async (input: {
  redis: Redis;
  hostId: string;
  streamId: string;
  timestamp: string;
}): Promise<void> => {
  const atMs = Date.parse(input.timestamp);
  if (!Number.isFinite(atMs)) return;
  await input.redis.incr(analyticsEventsHourKey(input.hostId, new Date(atMs)));
  await input.redis.hset(analyticsOverviewCacheKey(input.hostId), {
    lastStreamId: input.streamId,
    updatedAt: new Date().toISOString(),
  });
};

export const rebuildAnalyticsCacheFromStream = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<void> => {
  const { analyticsEventsStreamKey } = await import("./analytics-keys.js");
  const nowMs = Date.now();
  for (const date of hourBucketDates(nowMs)) {
    await input.redis.del(analyticsEventsHourKey(input.hostId, date));
  }
  await input.redis.del(analyticsOverviewCacheKey(input.hostId));

  const sinceMs = nowMs - DAY_MS;
  const entries = await input.redis.xrange(
    analyticsEventsStreamKey(input.hostId),
    `${sinceMs}-0`,
    "+"
  );

  for (const entry of entries) {
    const streamId = entry[0];
    const fields = entry[1];
    if (!Array.isArray(fields) || typeof streamId !== "string") continue;
    const tsIdx = fields.indexOf("timestamp");
    if (tsIdx < 0) continue;
    const timestamp = fields[tsIdx + 1];
    if (typeof timestamp !== "string") continue;
    await bumpAnalyticsOverviewOnEvent({
      redis: input.redis,
      hostId: input.hostId,
      streamId,
      timestamp,
    });
  }
};
