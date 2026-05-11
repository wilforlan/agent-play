import { describe, expect, it } from "vitest";
import {
  MINIMUM_PLAY_WORLD_BOUNDS,
  STREET_NAME_POOL,
  createVerticalStripSeedLayout,
} from "@agent-play/sdk";
import { WorldLayoutRepository } from "./world-layout-repository.js";

type HashRecord = Record<string, string>;

class FakeRedis {
  private readonly strings = new Map<string, string>();
  private readonly hashes = new Map<string, HashRecord>();
  private readonly lists = new Map<string, string[]>();

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.strings.set(key, value);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) removed += 1;
      if (this.hashes.delete(key)) removed += 1;
      if (this.lists.delete(key)) removed += 1;
    }
    return removed;
  }

  async hset(
    key: string,
    field: string | HashRecord,
    value?: string
  ): Promise<number> {
    const prev = this.hashes.get(key) ?? {};
    if (typeof field === "string") {
      this.hashes.set(key, { ...prev, [field]: value ?? "" });
      return 1;
    }
    this.hashes.set(key, { ...prev, ...field });
    return Object.keys(field).length;
  }

  async hgetall(key: string): Promise<HashRecord> {
    return { ...(this.hashes.get(key) ?? {}) };
  }

  async lpop(key: string): Promise<string | null> {
    const list = this.lists.get(key) ?? [];
    const head = list.shift();
    if (list.length === 0) {
      this.lists.delete(key);
    } else {
      this.lists.set(key, list);
    }
    return head ?? null;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const prev = this.lists.get(key) ?? [];
    const next = [...prev, ...values];
    this.lists.set(key, next);
    return next.length;
  }

  multi(): {
    set: FakeRedis["set"];
    del: FakeRedis["del"];
    hset: FakeRedis["hset"];
    rpush: FakeRedis["rpush"];
    exec: () => Promise<unknown[]>;
  } {
    const ops: Array<() => Promise<unknown>> = [];
    return {
      set: (key: string, value: string) => {
        ops.push(() => this.set(key, value));
        return Promise.resolve("OK" as const);
      },
      del: (...keys: string[]) => {
        ops.push(() => this.del(...keys));
        return Promise.resolve(1);
      },
      hset: (key: string, field: string | HashRecord, value?: string) => {
        ops.push(() => this.hset(key, field, value));
        return Promise.resolve(1);
      },
      rpush: (key: string, ...vals: string[]) => {
        ops.push(() => this.rpush(key, ...vals));
        return Promise.resolve(1);
      },
      exec: async () => {
        const out: unknown[] = [];
        for (const op of ops) {
          out.push(await op());
        }
        return out;
      },
    };
  }

  async quit(): Promise<void> {
    return;
  }

  snapshotLists(): Map<string, string[]> {
    return new Map(
      [...this.lists.entries()].map(([k, v]) => [k, [...v]])
    );
  }
}

describe("WorldLayoutRepository", () => {
  const hostId = "test-host";

  it("persists layout rev blob assigned hash and available list atomically", async () => {
    const redis = new FakeRedis();
    const repo = new WorldLayoutRepository({
      redis: redis as never,
      hostId,
    });
    const s0 = STREET_NAME_POOL[0];
    const s1 = STREET_NAME_POOL[1];
    const s2 = STREET_NAME_POOL[2];
    if (s0 === undefined || s1 === undefined || s2 === undefined) {
      throw new Error("pool");
    }
    const layout = createVerticalStripSeedLayout({
      bounds: MINIMUM_PLAY_WORLD_BOUNDS,
      streets: [s0, s1, s2],
    });
    await repo.saveLayout(layout);
    const roundtrip = await repo.getLayout();
    expect(roundtrip?.rev).toBe(1);
    expect(roundtrip?.zones.length).toBe(3);
    expect(await redis.get(`agent-play:${hostId}:world:layout:rev`)).toBe("1");
    const assigned = await redis.hgetall(
      `agent-play:${hostId}:world:streets:assigned`
    );
    expect(Object.keys(assigned).length).toBe(3);
    const availableKey = `agent-play:${hostId}:world:streets:available`;
    const popped = await redis.lpop(availableKey);
    expect(typeof popped).toBe("string");
    expect(STREET_NAME_POOL.some((s) => s.id === popped)).toBe(true);
  });

  it("bumpRev increments persisted layout and rev key", async () => {
    const redis = new FakeRedis();
    const repo = new WorldLayoutRepository({
      redis: redis as never,
      hostId,
    });
    const s0 = STREET_NAME_POOL[0];
    const s1 = STREET_NAME_POOL[1];
    const s2 = STREET_NAME_POOL[2];
    if (s0 === undefined || s1 === undefined || s2 === undefined) {
      throw new Error("pool");
    }
    await repo.saveLayout(
      createVerticalStripSeedLayout({
        bounds: MINIMUM_PLAY_WORLD_BOUNDS,
        streets: [s0, s1, s2],
      })
    );
    const nextRev = await repo.bumpRev();
    expect(nextRev).toBe(2);
    expect((await repo.getLayout())?.rev).toBe(2);
  });

  it("takeNextStreet consumes head of available list", async () => {
    const redis = new FakeRedis();
    const repo = new WorldLayoutRepository({
      redis: redis as never,
      hostId,
    });
    const s0 = STREET_NAME_POOL[0];
    const s1 = STREET_NAME_POOL[1];
    const s2 = STREET_NAME_POOL[2];
    if (s0 === undefined || s1 === undefined || s2 === undefined) {
      throw new Error("pool");
    }
    await repo.saveLayout(
      createVerticalStripSeedLayout({
        bounds: MINIMUM_PLAY_WORLD_BOUNDS,
        streets: [s0, s1, s2],
      })
    );
    const first = await repo.takeNextStreet();
    const second = await repo.takeNextStreet();
    expect(first.id).not.toBe(second.id);
  });

  it("returnStreet appends back to available list", async () => {
    const redis = new FakeRedis();
    const repo = new WorldLayoutRepository({
      redis: redis as never,
      hostId,
    });
    const s0 = STREET_NAME_POOL[0];
    const s1 = STREET_NAME_POOL[1];
    const s2 = STREET_NAME_POOL[2];
    if (s0 === undefined || s1 === undefined || s2 === undefined) {
      throw new Error("pool");
    }
    await repo.saveLayout(
      createVerticalStripSeedLayout({
        bounds: MINIMUM_PLAY_WORLD_BOUNDS,
        streets: [s0, s1, s2],
      })
    );
    const before = await repo.takeNextStreet();
    await repo.returnStreet(before.id);
    const lists = redis.snapshotLists();
    const availableKey = `agent-play:${hostId}:world:streets:available`;
    const tail = lists.get(availableKey);
    expect(tail?.includes(before.id)).toBe(true);
  });
});
