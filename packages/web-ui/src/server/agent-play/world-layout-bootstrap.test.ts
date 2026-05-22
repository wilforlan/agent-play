import { describe, expect, it } from "vitest";
import {
  MINIMUM_STREET_LAYOUT_BOUNDS,
  STREET_NAME_POOL,
  pickZoneForGroup,
} from "@agent-play/sdk";
import { bootstrapWorldLayoutIfNeeded } from "./world-layout-bootstrap.js";
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
        for (const op of ops) {
          await op();
        }
        return [];
      },
    };
  }
}

describe("bootstrapWorldLayoutIfNeeded", () => {
  it("seeds deterministic three strips with first three pool streets once", async () => {
    const redis = new FakeRedis();
    const repo = new WorldLayoutRepository({
      redis: redis as never,
      hostId: "h1",
    });
    const first = await bootstrapWorldLayoutIfNeeded({ repo });
    const agent = pickZoneForGroup(first, "agent");
    expect(agent.streetId).toBe(STREET_NAME_POOL[0]?.id);
    expect(agent.rect.minX).toBe(MINIMUM_STREET_LAYOUT_BOUNDS.minX);
    expect(agent.rect.maxX - agent.rect.minX + 1).toBe(7);
    const second = await bootstrapWorldLayoutIfNeeded({ repo });
    expect(second.rev).toBe(first.rev);
    expect(second.zones.length).toBe(first.zones.length);
  });
});
