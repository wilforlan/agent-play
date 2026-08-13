import { describe, expect, it } from "vitest";
import type { PurchaseRecord } from "@agent-play/sdk";
import { buildScannerTalkSummary } from "./scanner-economy.js";

type Stored = {
  strings: Map<string, string>;
  zsets: Map<string, Map<string, number>>;
};

const createMockRedis = (): Stored & {
  get: (key: string) => Promise<string | null>;
  zrevrange: (key: string, start: number, stop: number) => Promise<string[]>;
} => {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  return {
    strings,
    zsets,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async zrevrange(key, start, stop) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const sorted = [...bucket.entries()].sort((a, b) => b[1] - a[1]);
      const members = sorted.map(([member]) => member);
      if (stop === -1) {
        return members.slice(start);
      }
      return members.slice(start, stop + 1);
    },
  };
};

const talkTx = (input: {
  id: string;
  amenityKind: "talk_time" | "peer_talk_time";
  priceUsd: number;
  powerUpsEarned?: number;
}): PurchaseRecord & {
  hostId: string;
  indexedAt: string;
  op: "talkTick";
} => ({
  id: input.id,
  playerId: "caller-1",
  spaceId: input.amenityKind === "talk_time" ? "__talk__" : "__peer_talk__",
  amenityKind: input.amenityKind,
  itemRef:
    input.amenityKind === "talk_time"
      ? { kind: "shop", id: "openai-realtime" }
      : { kind: "peer_talk", id: "peer-webrtc" },
  priceUsd: input.priceUsd,
  at: "2026-05-12T00:00:00.000Z",
  powerUpsEarned: input.powerUpsEarned,
  hostId: "host-1",
  indexedAt: "2026-05-12T00:00:01.000Z",
  op: "talkTick",
});

describe("buildScannerTalkSummary", () => {
  it("includes peer_talk_time rows alongside talk_time", async () => {
    const redis = createMockRedis();
    const agent = talkTx({
      id: "talk-1",
      amenityKind: "talk_time",
      priceUsd: 0.25,
      powerUpsEarned: 1,
    });
    const peer = talkTx({
      id: "peer-1",
      amenityKind: "peer_talk_time",
      priceUsd: 0.014,
    });
    redis.strings.set("agent-play:host-1:scanner:tx:talk-1", JSON.stringify(agent));
    redis.strings.set("agent-play:host-1:scanner:tx:peer-1", JSON.stringify(peer));
    const zset = new Map<string, number>([
      ["talk-1", 1],
      ["peer-1", 2],
    ]);
    redis.zsets.set("agent-play:host-1:scanner:txs", zset);

    const summary = await buildScannerTalkSummary({
      redis: redis as never,
      hostId: "host-1",
    });
    expect(summary.sessions).toBe(2);
    expect(summary.totalChargedUsd).toBe(0.264);
    expect(summary.totalApuEarned).toBe(1);
  });
});
