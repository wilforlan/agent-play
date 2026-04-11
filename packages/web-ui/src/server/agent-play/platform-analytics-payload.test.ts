import { describe, expect, it } from "vitest";
import type Redis from "ioredis";
import { buildPlatformAnalyticsPayload } from "./platform-analytics-payload.js";

type HashRecord = Record<string, string>;

class FakeRedisForAnalytics {
  private readonly hashes = new Map<string, HashRecord>();
  private readonly strings = new Map<string, string>();
  private readonly lists = new Map<string, string[]>();

  constructor() {
    const prefix = "agent-play:testhost:";
    this.hashes.set(`${prefix}node:root:auth`, {
      kind: "root",
      createdAt: "2024-01-10T00:00:00.000Z",
    });
    this.hashes.set(`${prefix}node:main-one:auth`, {
      kind: "main",
      createdAt: "2024-02-15T00:00:00.000Z",
    });
    this.hashes.set(`${prefix}node:main-two:auth`, {
      kind: "main",
      createdAt: "2024-02-20T00:00:00.000Z",
    });
    this.hashes.set(`${prefix}node:main-one:auth:agent-node:ag1`, {});
    this.hashes.set(`${prefix}node:main-one:auth:agent-node:ag2`, {});
    this.hashes.set(`${prefix}session`, {
      sid: "sess-abc",
      merkleLeafCount: "4",
    });
    this.lists.set(`${prefix}session:eventlog`, ["e1", "e2"]);
    this.strings.set(
      `${prefix}session:snapshot`,
      JSON.stringify({
        sid: "sess-abc",
        worldMap: {
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          occupants: [
            { kind: "human", id: "h1", name: "Human", x: 0, y: 0 },
            {
              kind: "agent",
              agentId: "a1",
              name: "Bot",
              x: 1,
              y: 1,
            },
          ],
        },
      })
    );
  }

  seedAgentKeys(keys: string[]): void {
    for (const k of keys) {
      this.hashes.set(k, { id: "x" });
    }
  }

  async scan(cursor: string, ...args: string[]): Promise<[string, string[]]> {
    const mIdx = args.indexOf("MATCH");
    const pattern =
      mIdx >= 0 && args[mIdx + 1] !== undefined ? args[mIdx + 1]! : "*";
    const all = Array.from(this.hashes.keys()).concat(
      Array.from(this.strings.keys())
    );
    const glob = pattern.replace(/\*/g, ".*");
    const re = new RegExp(`^${glob}$`);
    const out = all.filter((k) => re.test(k));
    return ["0", out];
  }

  async hgetall(key: string): Promise<HashRecord> {
    return { ...(this.hashes.get(key) ?? {}) };
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async llen(key: string): Promise<number> {
    return this.lists.get(key)?.length ?? 0;
  }
}

describe("buildPlatformAnalyticsPayload", () => {
  it("returns aggregate cards, series, player chain, and histogram from redis data", async () => {
    const redis = new FakeRedisForAnalytics();
    redis.seedAgentKeys([
      "agent-play:testhost:agent:ent1",
      "agent-play:testhost:agent:ent2",
    ]);
    const payload = await buildPlatformAnalyticsPayload({
      redis: redis as unknown as Redis,
      hostId: "testhost",
    });

    expect(payload.hostId).toBe("testhost");
    expect(payload.cards.genesisNodeCount).toBe(1);
    expect(payload.cards.mainNodeAccounts).toBe(2);
    expect(payload.cards.agentNodeCredentials).toBe(2);
    expect(payload.cards.inWorldAgentRecords).toBe(2);
    expect(payload.series.nodesCreatedByMonth.length).toBeGreaterThan(0);
    expect(payload.playerChain.sessionSid).toBe("sess-abc");
    expect(payload.playerChain.merkleLeafCount).toBe(4);
    expect(payload.playerChain.eventLogLength).toBe(2);
    expect(payload.playerChain.snapshotOccupantCount).toBe(2);
    expect(payload.playerChain.occupantKinds).toEqual({
      human: 1,
      agent: 1,
      mcp: 0,
    });
    expect(payload.agentsPerMainHistogram.mainsWithZeroAgentNodes).toBe(1);
    expect(payload.agentsPerMainHistogram.mainsWithOneAgentNode).toBe(0);
    expect(payload.agentsPerMainHistogram.mainsWithTwoOrMoreAgentNodes).toBe(1);
    expect(payload.definitions.mainNodeAccounts.length).toBeGreaterThan(0);
  });
});
