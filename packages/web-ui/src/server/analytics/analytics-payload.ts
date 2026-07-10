import type Redis from "ioredis";
import {
  AnalyticsEventSchema,
  type AnalyticsEvent,
} from "@agent-play/sdk";
import { ensureAnalyticsBackfillStarted, readAnalyticsMigrationState } from "./analytics-backfill.js";
import {
  hasAnalyticsOverviewCache,
  readAnalyticsOverviewCache,
} from "./analytics-cache.js";
import {
  analyticsEventByNameKey,
  analyticsEventCountKey,
  analyticsEventsStreamKey,
  analyticsPropertyAggKey,
} from "./analytics-keys.js";
import { getAnalyticsEvent } from "./analytics-tracker.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsOverview = {
  generatedAt: string;
  migrationStatus: string;
  eventsLast24h: number;
  topEvents: ReadonlyArray<{ event: string; count: number }>;
};

export const buildAnalyticsOverview = async (input: {
  redis: Redis;
  hostId: string;
}): Promise<AnalyticsOverview> => {
  ensureAnalyticsBackfillStarted(input);
  const migration = await readAnalyticsMigrationState(input);

  const useCache = await hasAnalyticsOverviewCache(input);
  let eventsLast24h: number;

  if (useCache) {
    const cache = await readAnalyticsOverviewCache(input);
    eventsLast24h = cache.eventsLast24h;
  } else {
    const sinceMs = Date.now() - DAY_MS;
    const streamEntries = await input.redis.xrange(
      analyticsEventsStreamKey(input.hostId),
      `${sinceMs}-0`,
      "+"
    );
    eventsLast24h = streamEntries.length;
  }

  const eventNames = [
    "Purchase Completed",
    "Wallet Bundle Redeemed",
    "Game Round Completed",
    "Talk Session Billed",
    "Space Entered",
    "Wallet Seeded",
  ];

  const topEvents: Array<{ event: string; count: number }> = [];
  for (const event of eventNames) {
    const countRaw = await input.redis.get(
      analyticsEventCountKey(input.hostId, event)
    );
    const count = countRaw !== null ? Number(countRaw) : 0;
    if (count > 0) topEvents.push({ event, count });
  }
  topEvents.sort((a, b) => b.count - a.count);

  return {
    generatedAt: new Date().toISOString(),
    migrationStatus: migration?.status ?? "pending",
    eventsLast24h,
    topEvents,
  };
};

const BLOCKED_PROPERTY_KEYS = new Set([
  "sid",
  "email",
  "ip",
  "ipAddress",
  "deviceId",
  "name",
  "description",
]);

const PUBLIC_TRAIT_KEYS = new Set(["nodeKind"]);

export const sanitizeAnalyticsEventForPublic = (
  event: AnalyticsEvent
): AnalyticsEvent => {
  const safeProperties: Record<string, AnalyticsEvent["properties"][string]> =
    {};
  for (const [key, value] of Object.entries(event.properties)) {
    if (BLOCKED_PROPERTY_KEYS.has(key)) continue;
    if (typeof value === "string" && value.length > 200) continue;
    safeProperties[key] = value;
  }

  const context =
    event.context !== undefined
      ? {
          hostId: event.context.hostId,
          library: event.context.library,
          snapshotRev: event.context.snapshotRev,
        }
      : undefined;

  return AnalyticsEventSchema.parse({
    messageId: event.messageId,
    event: event.event,
    distinctId: event.distinctId,
    timestamp: event.timestamp,
    properties: safeProperties,
    context,
  });
};

export const sanitizeTraitsForPublic = (
  traits: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(traits)) {
    if (!PUBLIC_TRAIT_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
};

export type AnalyticsEventPage = {
  readonly events: ReadonlyArray<AnalyticsEvent>;
  readonly nextCursor: string | null;
  readonly lastStreamId?: string | null;
};

const parseStreamSummaryEvent = (
  fields: string[]
): AnalyticsEvent | null => {
  const messageIdIdx = fields.indexOf("messageId");
  const eventIdx = fields.indexOf("event");
  const distinctIdIdx = fields.indexOf("distinctId");
  const timestampIdx = fields.indexOf("timestamp");
  if (messageIdIdx < 0 || eventIdx < 0 || timestampIdx < 0) return null;
  const messageId = fields[messageIdIdx + 1];
  const event = fields[eventIdx + 1];
  const timestamp = fields[timestampIdx + 1];
  if (typeof messageId !== "string" || typeof event !== "string") return null;
  if (typeof timestamp !== "string") return null;
  const distinctId =
    distinctIdIdx >= 0 && typeof fields[distinctIdIdx + 1] === "string"
      ? fields[distinctIdIdx + 1]
      : undefined;
  return AnalyticsEventSchema.parse({
    messageId,
    event,
    timestamp,
    distinctId,
    properties: {},
  });
};

export const listAnalyticsEvents = async (input: {
  redis: Redis;
  hostId: string;
  event?: string;
  limit: number;
  cursor?: string;
  since?: string;
  fields?: "summary" | "full";
}): Promise<AnalyticsEventPage> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const useSummary = input.fields !== "full";
  const key =
    input.event !== undefined && input.event.length > 0
      ? analyticsEventByNameKey(input.hostId, input.event)
      : analyticsEventsStreamKey(input.hostId);

  if (key.endsWith(":events")) {
    if (input.since !== undefined && input.since.length > 0) {
      const entries = await input.redis.xrange(
        key,
        `(${input.since}`,
        "+",
        "COUNT",
        limit
      );
      const events: AnalyticsEvent[] = [];
      for (const entry of [...entries].reverse()) {
        const fields = entry[1];
        if (!Array.isArray(fields)) continue;
        if (useSummary) {
          const summary = parseStreamSummaryEvent(fields);
          if (summary !== null) events.push(summary);
        } else {
          const messageIdIdx = fields.indexOf("messageId");
          if (messageIdIdx < 0) continue;
          const messageId = fields[messageIdIdx + 1];
          if (typeof messageId !== "string") continue;
          const event = await getAnalyticsEvent({
            redis: input.redis,
            hostId: input.hostId,
            messageId,
          });
          if (event !== null) events.push(event);
        }
      }
      const newest = entries[entries.length - 1];
      return {
        events,
        nextCursor: null,
        lastStreamId: newest?.[0] ?? null,
      };
    }

    const start = input.cursor ?? "-";
    const entries = await input.redis.xrevrange(key, "+", start, "COUNT", limit);
    const events: AnalyticsEvent[] = [];
    for (const entry of entries) {
      const fields = entry[1];
      if (!Array.isArray(fields)) continue;
      const messageIdIdx = fields.indexOf("messageId");
      if (messageIdIdx < 0) continue;
      const messageId = fields[messageIdIdx + 1];
      if (typeof messageId !== "string") continue;
      const event = await getAnalyticsEvent({
        redis: input.redis,
        hostId: input.hostId,
        messageId,
      });
      if (event !== null) events.push(event);
    }
    const nextCursor = entries.length > 0 ? entries[entries.length - 1]?.[0] ?? null : null;
    const newestStreamId = entries.length > 0 ? entries[0]?.[0] ?? null : null;
    return { events, nextCursor, lastStreamId: newestStreamId };
  }

  const maxScore =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor) - 1
      : "+inf";
  const ids = await input.redis.zrevrangebyscore(
    key,
    maxScore,
    "-inf",
    "LIMIT",
    0,
    limit
  );
  const events: AnalyticsEvent[] = [];
  for (const messageId of ids) {
    const event = await getAnalyticsEvent({
      redis: input.redis,
      hostId: input.hostId,
      messageId,
    });
    if (event !== null) events.push(event);
  }
  const lastId = ids[ids.length - 1];
  const nextCursor =
    lastId !== undefined
      ? String(await input.redis.zscore(key, lastId))
      : null;
  return { events, nextCursor };
};

export const getAnalyticsPropertyBreakdown = async (input: {
  redis: Redis;
  hostId: string;
  event: string;
  property: string;
}): Promise<ReadonlyArray<{ value: string; count: number }>> => {
  const raw = await input.redis.hgetall(
    analyticsPropertyAggKey(input.hostId, input.event, input.property)
  );
  return Object.entries(raw)
    .map(([value, count]) => ({ value, count: Number(count) }))
    .sort((a, b) => b.count - a.count);
};

export const computeAnalyticsFunnel = async (input: {
  redis: Redis;
  hostId: string;
  steps: readonly string[];
}): Promise<ReadonlyArray<{ step: string; count: number }>> => {
  const out: Array<{ step: string; count: number }> = [];
  for (const step of input.steps) {
    const countRaw = await input.redis.get(
      analyticsEventCountKey(input.hostId, step)
    );
    out.push({ step, count: countRaw !== null ? Number(countRaw) : 0 });
  }
  return out;
};
