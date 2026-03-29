import { describe, expect, it, vi } from "vitest";
import { RedisSessionStore } from "./redis-session-store.js";

function createMockRedis(): {
  redis: {
    hget: ReturnType<typeof vi.fn>;
    hsetnx: ReturnType<typeof vi.fn>;
    hset: ReturnType<typeof vi.fn>;
    multi: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    lpush: ReturnType<typeof vi.fn>;
    ltrim: ReturnType<typeof vi.fn>;
    lrange: ReturnType<typeof vi.fn>;
    llen: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  hash: Map<string, string>;
} {
  const hash = new Map<string, string>();
  const redis = {
    hget: vi.fn(async (key: string, field: string) => {
      if (key !== "agent-play:test:session") return null;
      return hash.get(field) ?? null;
    }),
    hsetnx: vi.fn(async (_key: string, field: string, value: string) => {
      if (field === "sid" && hash.has("sid")) return 0;
      hash.set(field, value);
      return 1;
    }),
    hset: vi.fn(
      async (
        key: string,
        arg2: string | Record<string, string>,
        arg3?: string
      ) => {
        if (key !== "agent-play:test:session") return 0;
        if (typeof arg2 === "object" && arg2 !== null) {
          for (const [k, v] of Object.entries(arg2)) {
            hash.set(k, v);
          }
          return 1;
        }
        if (typeof arg2 === "string" && typeof arg3 === "string") {
          hash.set(arg2, arg3);
        }
        return 1;
      }
    ),
    multi: vi.fn(() => {
      const q: Array<() => Promise<unknown>> = [];
      const pipe = {
        hset: (
          key: string,
          arg2: string | Record<string, string>,
          arg3?: string
        ) => {
          q.push(async () => redis.hset(key, arg2, arg3));
        },
        lpush: (key: string, line: string) => {
          q.push(async () => redis.lpush(key, line));
        },
        ltrim: (key: string, start: number, end: number) => {
          q.push(async () => redis.ltrim(key, start, end));
        },
        exec: async () => {
          for (const fn of q) await fn();
          return [];
        },
      };
      return pipe;
    }),
    set: vi.fn(async () => "OK"),
    hgetall: vi.fn(async (key: string) => {
      if (key === "agent-play:test:session") {
        return Object.fromEntries(hash);
      }
      return {};
    }),
    lpush: vi.fn(async (_key: string, _line: string) => 1),
    ltrim: vi.fn(async (_key: string, _start: number, _end: number) => "OK"),
    lrange: vi.fn(async () => []),
    llen: vi.fn(async () => 0),
    get: vi.fn(async () => null),
  };
  return { redis, hash };
}

describe("RedisSessionStore", () => {
  it("loadOrCreateSessionId writes sid to redis when empty", async () => {
    const { redis, hash } = createMockRedis();
    const store = new RedisSessionStore({
      redis: redis as never,
      hostId: "test",
    });
    const sid = await store.loadOrCreateSessionId();
    expect(sid.length).toBeGreaterThan(10);
    expect(hash.get("sid")).toBe(sid);
  });

  it("isValidSession matches canonical sid in redis", async () => {
    const { redis, hash } = createMockRedis();
    hash.set("sid", "canonical-1");
    const store = new RedisSessionStore({
      redis: redis as never,
      hostId: "test",
    });
    await expect(store.isValidSession("canonical-1")).resolves.toBe(true);
    await expect(store.isValidSession("other")).resolves.toBe(false);
  });
});
