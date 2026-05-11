import { describe, expect, it } from "vitest";
import {
  createNodeCredentialMaterial,
  nodeCredentialFromHumanPhrase,
} from "@agent-play/node-tools";
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

  async hget(key: string, field: string): Promise<string | null> {
    const record = this.hashes.get(key);
    if (record === undefined) {
      return null;
    }
    return record[field] ?? null;
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

  multi(): {
    hset: FakeRedis["hset"];
    set: FakeRedis["set"];
    exec: () => Promise<[]>;
  } {
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
  const rootKey = "fixture-root";

  it("stores the client-supplied passwHash and derives the node id under the current root key", async () => {
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });
    const credential = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple arch atlas aura autumn bamboo",
      rootKey,
    });

    const created = await repository.createNode({
      kind: "main",
      nodeId: credential.nodeId,
      passwHash: credential.passwHash,
    });

    expect(created.nodeId).toBe(credential.nodeId);
    expect(
      await repository.verifyNodePasswHash({
        nodeId: credential.nodeId,
        passwHash: credential.passwHash,
      })
    ).toBe(true);
    expect(
      await repository.verifyNodePasswHash({
        nodeId: credential.nodeId,
        passwHash: "deadbeef",
      })
    ).toBe(false);
  });

  it("rejects main node creation when nodeId does not derive from passwHash", async () => {
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });
    const credential = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple arch atlas",
      rootKey,
    });

    await expect(
      repository.createNode({
        kind: "main",
        nodeId: "tampered-node-id",
        passwHash: credential.passwHash,
      })
    ).rejects.toThrow(/derivative/);
  });

  it("detects existing attachment when re-registering the same agent node id", async () => {
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });

    const main = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple arch atlas aura autumn bamboo beacon birch blossom",
      rootKey,
    });
    await repository.createNode({
      kind: "main",
      nodeId: main.nodeId,
      passwHash: main.passwHash,
    });

    const firstAgent = createNodeCredentialMaterial({ rootKey });
    await repository.createAgentNode({
      parentNodeId: main.nodeId,
      agentId: firstAgent.nodeId,
      passwHash: firstAgent.passwHash,
    });

    const otherAgent = createNodeCredentialMaterial({ rootKey });
    await expect(
      repository.createAgentNode({
        parentNodeId: main.nodeId,
        agentId: firstAgent.nodeId,
        passwHash: otherAgent.passwHash,
      })
    ).rejects.toThrow(/already attached/);
  });

  it("rejects agent node creation when agentId does not derive from passwHash", async () => {
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });
    const main = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple",
      rootKey,
    });
    await repository.createNode({
      kind: "main",
      nodeId: main.nodeId,
      passwHash: main.passwHash,
    });
    const agent = createNodeCredentialMaterial({ rootKey });

    await expect(
      repository.createAgentNode({
        parentNodeId: main.nodeId,
        agentId: "tampered-agent-id",
        passwHash: agent.passwHash,
      })
    ).rejects.toThrow(/derivative/);
  });

  it("generates and returns a phrase only for space nodes when passwHash is omitted", async () => {
    const redis = new FakeRedis();
    const repository = new RedisAgentRepository({
      redis: redis as never,
      hostId: "default",
      rootKey,
    });
    const created = await repository.createNode({
      kind: "space",
      spaceId: "space-1",
    });
    expect(typeof created.phrase).toBe("string");
    expect((created.phrase ?? "").split(" ").length).toBe(10);
    const node = await repository.getNode(created.nodeId);
    expect(node?.kind).toBe("space");
    expect(node?.spaceId).toBe("space-1");
  });
});
