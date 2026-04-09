import { describe, expect, it } from "vitest";
import { deriveNodeIdFromPassword } from "@agent-play/node-tools";
import { RedisAgentRepository } from "./redis-agent-repository.js";

type HashRecord = Record<string, string>;

class FakeRedis {
  private readonly strings = new Map<string, string>();
  private readonly hashes = new Map<string, HashRecord>();

  async exists(key: string): Promise<number> {
    return this.hashes.has(key) || this.strings.has(key) ? 1 : 0;
  }

  async hgetall(key: string): Promise<HashRecord> {
    return { ...(this.hashes.get(key) ?? {}) };
  }

  async hset(key: string, field: string | HashRecord, value?: string): Promise<number> {
    const prev = this.hashes.get(key) ?? {};
    if (typeof field === "string") {
      this.hashes.set(key, { ...prev, [field]: value ?? "" });
      return 1;
    }
    this.hashes.set(key, { ...prev, ...field });
    return Object.keys(field).length;
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.strings.set(key, value);
    return "OK";
  }

  multi(): { hset: FakeRedis["hset"]; set: FakeRedis["set"]; exec: () => Promise<[]> } {
    const ops: Array<() => Promise<unknown>> = [];
    return {
      hset: (key: string, field: string | HashRecord, value?: string) => {
        ops.push(() => this.hset(key, field, value));
        return Promise.resolve(1);
      },
      set: (key: string, value: string) => {
        ops.push(() => this.set(key, value));
        return Promise.resolve("OK" as const);
      },
      exec: async () => {
        for (const op of ops) {
          await op();
        }
        return [];
      },
    };
  }

  async quit(): Promise<void> {
    return;
  }
}

describe("RedisAgentRepository", () => {
  it("detects existing attachment by existence even when incoming hash differs", async () => {
    const rootKey = "fixture-root";
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });

    const mainPassw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const createdNode = await repository.createNode({
      kind: "main",
      passw: mainPassw,
    });

    const firstAgentPassw = "orchid pearl river stone wind north south cedar pine fern";
    const firstAgentId = deriveNodeIdFromPassword({
      password: firstAgentPassw,
      rootKey,
    });
    await repository.createAgentNode({
      parentNodeId: createdNode.nodeId,
      agentId: firstAgentId,
      passw: firstAgentPassw,
    });

    const secondAgentPassw = "delta gamma alpha beta zeta eta theta iota kappa lambda";
    await expect(
      repository.createAgentNode({
        parentNodeId: createdNode.nodeId,
        agentId: firstAgentId,
        passw: secondAgentPassw,
      })
    ).rejects.toThrow(/already attached/);
  });
});
