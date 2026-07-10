import type Redis from "ioredis";
import {
  AnalyticsEventSchema,
  AnalyticsTraitsSchema,
  type AnalyticsEvent,
  type AnalyticsPropertyValue,
  type AnalyticsTraits,
} from "@agent-play/sdk";
import {
  ANALYTICS_EVENT_BODY_TTL_SECONDS,
  ANALYTICS_STREAM_MAXLEN,
  analyticsByUserKey,
  analyticsEventBodyKey,
  analyticsEventByNameKey,
  analyticsEventCountKey,
  analyticsEventsStreamKey,
  analyticsPropertyAggKey,
  analyticsTraitsKey,
} from "./analytics-keys.js";

const timestampToScore = (iso: string): number => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
};

const propertyValueKey = (value: AnalyticsPropertyValue): string => {
  if (value === null) return "null";
  return String(value);
};

export const trackEvent = async (input: {
  redis: Redis;
  hostId: string;
  event: AnalyticsEvent;
}): Promise<void> => {
  const row = AnalyticsEventSchema.parse(input.event);
  const bodyKey = analyticsEventBodyKey(input.hostId, row.messageId);
  const existing = await input.redis.get(bodyKey);
  if (existing !== null) return;

  const score = timestampToScore(row.timestamp);
  const streamId = await input.redis.xadd(
    analyticsEventsStreamKey(input.hostId),
    "MAXLEN",
    "~",
    ANALYTICS_STREAM_MAXLEN,
    "*",
    "messageId",
    row.messageId,
    "event",
    row.event,
    "distinctId",
    row.distinctId,
    "timestamp",
    row.timestamp
  );

  const multi = input.redis.multi();
  multi.set(
    bodyKey,
    JSON.stringify(row),
    "EX",
    ANALYTICS_EVENT_BODY_TTL_SECONDS
  );
  multi.zadd(analyticsEventByNameKey(input.hostId, row.event), score, row.messageId);
  multi.zadd(analyticsByUserKey(input.hostId, row.distinctId), score, row.messageId);
  multi.incr(analyticsEventCountKey(input.hostId, row.event));

  for (const [property, value] of Object.entries(row.properties)) {
    multi.hincrby(
      analyticsPropertyAggKey(input.hostId, row.event, property),
      propertyValueKey(value),
      1
    );
  }

  await multi.exec();

  if (typeof streamId === "string") {
    const { bumpAnalyticsOverviewOnEvent } = await import("./analytics-cache.js");
    await bumpAnalyticsOverviewOnEvent({
      redis: input.redis,
      hostId: input.hostId,
      streamId,
      timestamp: row.timestamp,
    });
  }
};

export const identifyTraits = async (input: {
  redis: Redis;
  hostId: string;
  traits: AnalyticsTraits;
}): Promise<void> => {
  const row = AnalyticsTraitsSchema.parse(input.traits);
  const key = analyticsTraitsKey(input.hostId, row.distinctId);
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.traits)) {
    fields[k] = propertyValueKey(v);
  }
  fields.updatedAt = row.timestamp;
  if (Object.keys(fields).length === 0) return;
  await input.redis.hset(key, fields);
};

export const getAnalyticsEvent = async (input: {
  redis: Redis;
  hostId: string;
  messageId: string;
}): Promise<AnalyticsEvent | null> => {
  const raw = await input.redis.get(
    analyticsEventBodyKey(input.hostId, input.messageId)
  );
  if (raw === null) return null;
  try {
    return AnalyticsEventSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
};
