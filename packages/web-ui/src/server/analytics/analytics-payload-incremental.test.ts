import { describe, expect, it } from "vitest";
import { listAnalyticsEvents } from "./analytics-payload.js";
import { analyticsEventsStreamKey } from "./analytics-keys.js";

type StreamEntry = [string, string[]];

type MockRedis = {
  streams: Map<string, StreamEntry[]>;
  strings: Map<string, string>;
  xrange: (
    key: string,
    start: string,
    end: string,
    countKeyword?: string,
    count?: number
  ) => Promise<StreamEntry[]>;
  xrevrange: (
    key: string,
    end: string,
    start: string,
    countKeyword?: string,
    count?: number
  ) => Promise<StreamEntry[]>;
  get: (key: string) => Promise<string | null>;
};

const createMockRedis = (): MockRedis => {
  const streams = new Map<string, StreamEntry[]>();
  const strings = new Map<string, string>();

  return {
    streams,
    strings,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async xrange(key, start, end, countKeyword, count) {
      const entries = streams.get(key) ?? [];
      const filtered = entries.filter(([id]) => {
        const exclusive = start.startsWith("(");
        const startId = exclusive ? start.slice(1) : start;
        const startOk =
          start === "-" ? true : exclusive ? id > startId : id >= startId;
        const endOk = end === "+" || id <= end;
        return startOk && endOk;
      });
      if (countKeyword === "COUNT" && count !== undefined) {
        return filtered.slice(0, count);
      }
      return filtered;
    },
    async xrevrange(key, end, start, countKeyword, count) {
      const entries = [...(streams.get(key) ?? [])].reverse();
      const filtered = entries.filter(([id]) => {
        const endOk = end === "+" || id <= end;
        const startOk = start === "-" || id >= start;
        return endOk && startOk;
      });
      if (countKeyword === "COUNT" && count !== undefined) {
        return filtered.slice(0, count);
      }
      return filtered;
    },
  };
};

describe("listAnalyticsEvents incremental", () => {
  it("returns only stream entries after since in newest-first order", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const key = analyticsEventsStreamKey(hostId);
    redis.streams.set(key, [
      [
        "1000-0",
        [
          "messageId",
          "msg-1",
          "event",
          "Wallet Seeded",
          "distinctId",
          "node-1",
          "timestamp",
          "1000",
        ],
      ],
      [
        "2000-0",
        [
          "messageId",
          "msg-2",
          "event",
          "Purchase Completed",
          "distinctId",
          "node-1",
          "timestamp",
          "2000",
        ],
      ],
      [
        "3000-0",
        [
          "messageId",
          "msg-3",
          "event",
          "Space Entered",
          "distinctId",
          "node-2",
          "timestamp",
          "3000",
        ],
      ],
    ]);
    redis.strings.set(
      `agent-play:${hostId}:analytics:event:msg-2`,
      JSON.stringify({
        messageId: "msg-2",
        event: "Purchase Completed",
        distinctId: "node-1",
        timestamp: "2000",
        properties: { amenityKind: "shop" },
      })
    );
    redis.strings.set(
      `agent-play:${hostId}:analytics:event:msg-3`,
      JSON.stringify({
        messageId: "msg-3",
        event: "Space Entered",
        distinctId: "node-2",
        timestamp: "3000",
        properties: {},
      })
    );

    const page = await listAnalyticsEvents({
      redis: redis as never,
      hostId,
      limit: 10,
      since: "1000-0",
      fields: "summary",
    });

    expect(page.events.map((event) => event.messageId)).toEqual([
      "msg-3",
      "msg-2",
    ]);
    expect(page.lastStreamId).toBe("3000-0");
  });
});
