import { describe, expect, it } from "vitest";
import {
  occupancyKeyForPosition,
  pickZoneForGroup,
  type WorldLayout,
} from "@agent-play/sdk";
import { RedisSessionStore } from "./redis-session-store.js";
import { PLAYER_ADDED_EVENT } from "./play-transport.js";
import {
  getDefaultPreviewWorldLayoutJson,
  normalizePreviewSnapshot,
  snapshotWorldMapWithResolvedAgents,
  type PreviewSnapshotJson,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapOccupantJson,
  type WorldLayoutJson,
} from "./preview-serialize.js";
import {
  emptySnapshot,
  ensureWorldSnapshot,
  upsertAgentOccupant,
} from "./world-snapshot-helpers.js";

type HashRecord = Record<string, string>;

function worldLayoutJsonToRuntime(json: WorldLayoutJson): WorldLayout {
  return {
    rev: json.rev,
    bounds: { ...json.bounds },
    zones: json.zones.map((z) => ({
      id: z.id,
      streetId: z.streetId,
      streetLabel: z.streetLabel,
      primaryGroup: z.primaryGroup,
      allowedGroups: [...z.allowedGroups],
      rect: { ...z.rect },
    })),
    streets: json.streets.map((s) => ({ id: s.id, label: s.label })),
  };
}

function snapshotWithOccupants(
  base: PreviewSnapshotJson,
  occupants: PreviewWorldMapOccupantJson[]
): PreviewSnapshotJson {
  const normalized = normalizePreviewSnapshot({
    ...base,
    worldMap: { ...base.worldMap, occupants },
  });
  return {
    ...normalized,
    worldMap: snapshotWorldMapWithResolvedAgents(
      normalized.worldMap,
      normalized.worldLayout
    ),
  };
}

function appendAgentToSnapshot(
  cached: PreviewSnapshotJson | null,
  input: { agentId: string; name: string; genesis: string }
): { next: PreviewSnapshotJson; fanout: Array<{ event: string; data: unknown }> } {
  const base = ensureWorldSnapshot(cached, input.genesis);
  const layout = worldLayoutJsonToRuntime(
    base.worldLayout ?? getDefaultPreviewWorldLayoutJson()
  );
  const agentStreet = pickZoneForGroup(layout, "agent");
  const row: PreviewWorldMapAgentOccupantJson = {
    kind: "agent",
    agentId: input.agentId,
    name: input.name,
    streetId: agentStreet.streetId,
    stationary: true,
  };
  const next = snapshotWithOccupants(
    base,
    upsertAgentOccupant(base.worldMap.occupants, row)
  );
  return {
    next,
    fanout: [{ event: PLAYER_ADDED_EVENT, data: { player: row } }],
  };
}

class SnapshotCasFakeRedis {
  private readonly strings = new Map<string, string>();
  private readonly hashes = new Map<string, HashRecord>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly keyVersions = new Map<string, number>();
  private watchVersions: Map<string, number> | null = null;
  abortNextExec = false;
  readonly published: Array<{ channel: string; message: string }> = [];

  private bumpKey(key: string): void {
    this.keyVersions.set(key, (this.keyVersions.get(key) ?? 0) + 1);
  }

  async watch(...keys: string[]): Promise<"OK"> {
    this.watchVersions = new Map(
      keys.map((key) => [key, this.keyVersions.get(key) ?? 0])
    );
    return "OK";
  }

  async unwatch(): Promise<"OK"> {
    this.watchVersions = null;
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.strings.set(key, value);
    this.bumpKey(key);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) {
        removed += 1;
        this.bumpKey(key);
      }
      if (this.hashes.delete(key)) {
        removed += 1;
        this.bumpKey(key);
      }
      if (this.sets.delete(key)) {
        removed += 1;
        this.bumpKey(key);
      }
    }
    return removed;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const prev = this.sets.get(key) ?? new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!prev.has(member)) {
        prev.add(member);
        added += 1;
      }
    }
    this.sets.set(key, prev);
    if (added > 0) {
      this.bumpKey(key);
    }
    return added;
  }

  async hset(
    key: string,
    field: string | HashRecord,
    value?: string
  ): Promise<number> {
    const prev = this.hashes.get(key) ?? {};
    if (typeof field === "string") {
      this.hashes.set(key, { ...prev, [field]: value ?? "" });
    } else {
      this.hashes.set(key, { ...prev, ...field });
    }
    this.bumpKey(key);
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.[field] ?? null;
  }

  async hgetall(key: string): Promise<HashRecord> {
    return { ...(this.hashes.get(key) ?? {}) };
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const prev = this.hashes.get(key) ?? {};
    const raw = prev[field];
    const current = raw !== undefined && raw.length > 0 ? Number(raw) : 0;
    const next = current + increment;
    this.hashes.set(key, { ...prev, [field]: String(next) });
    this.bumpKey(key);
    return next;
  }

  async hsetnx(key: string, field: string, value: string): Promise<number> {
    const prev = this.hashes.get(key) ?? {};
    if (field in prev) {
      return 0;
    }
    this.hashes.set(key, { ...prev, [field]: value });
    this.bumpKey(key);
    return 1;
  }

  multi(): {
    set: (key: string, value: string) => Promise<"OK">;
    del: (...keys: string[]) => Promise<number>;
    sadd: (key: string, ...members: string[]) => Promise<number>;
    hset: (key: string, field: string | HashRecord, value?: string) => Promise<number>;
    hincrby: (key: string, field: string, increment: number) => Promise<number>;
    exec: () => Promise<unknown[] | null>;
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
      sadd: (key: string, ...members: string[]) => {
        ops.push(() => this.sadd(key, ...members));
        return Promise.resolve(1);
      },
      hset: (key: string, field: string | HashRecord, value?: string) => {
        ops.push(() => this.hset(key, field, value));
        return Promise.resolve(1);
      },
      hincrby: (key: string, field: string, increment: number) => {
        ops.push(() => this.hincrby(key, field, increment));
        return Promise.resolve(1);
      },
      exec: async () => {
        if (this.abortNextExec) {
          this.abortNextExec = false;
          this.watchVersions = null;
          return null;
        }
        if (this.watchVersions !== null) {
          for (const [key, version] of this.watchVersions.entries()) {
            if ((this.keyVersions.get(key) ?? 0) !== version) {
              this.watchVersions = null;
              return null;
            }
          }
        }
        const out: unknown[] = [];
        for (const op of ops) {
          out.push(await op());
        }
        this.watchVersions = null;
        return out;
      },
    };
  }

  async quit(): Promise<void> {
    return;
  }

  async publish(channel: string, message: string): Promise<number> {
    this.published.push({ channel, message });
    return 1;
  }
}

describe("RedisSessionStore runSnapshotMutation", () => {
  const hostId = "cas-test-host";
  const genesis = "test-genesis-root";

  async function createStore(
    redis: SnapshotCasFakeRedis
  ): Promise<RedisSessionStore> {
    const store = new RedisSessionStore({
      redis: redis as never,
      hostId,
      playerChainGenesis: genesis,
    });
    await store.loadOrCreateSessionId();
    await store.persistSnapshot(emptySnapshot(store.getSessionId()));
    return store;
  }

  it("assigns distinct agent strip cells under concurrent mutations", async () => {
    const redis = new SnapshotCasFakeRedis();
    const store = await createStore(redis);
    await Promise.all([
      store.runSnapshotMutation({
        mutate: async (cached) =>
          appendAgentToSnapshot(cached, {
            agentId: "agent-alpha",
            name: "Alpha",
            genesis,
          }),
      }),
      store.runSnapshotMutation({
        mutate: async (cached) =>
          appendAgentToSnapshot(cached, {
            agentId: "agent-beta",
            name: "Beta",
            genesis,
          }),
      }),
    ]);
    const snap = await store.getSnapshotJson();
    const agents = (snap?.worldMap.occupants ?? []).filter(
      (o): o is PreviewWorldMapAgentOccupantJson => o.kind === "agent"
    );
    expect(agents).toHaveLength(2);
    const alpha = agents.find((a) => a.agentId === "agent-alpha");
    const beta = agents.find((a) => a.agentId === "agent-beta");
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    if (alpha === undefined || beta === undefined) {
      return;
    }
    expect(
      occupancyKeyForPosition(alpha.x, alpha.y) ===
        occupancyKeyForPosition(beta.x, beta.y)
    ).toBe(false);
  });

  it("retries after WATCH abort and publishes fanout once on success", async () => {
    const redis = new SnapshotCasFakeRedis();
    redis.abortNextExec = true;
    const store = await createStore(redis);
    let fanoutCount = 0;
    const originalPublish = store.publishWorldFanout.bind(store);
    store.publishWorldFanout = async (...args) => {
      fanoutCount += 1;
      return originalPublish(...args);
    };
    await store.runSnapshotMutation({
      mutate: async (cached) =>
        appendAgentToSnapshot(cached, {
          agentId: "agent-retry",
          name: "Retry",
          genesis,
        }),
    });
    const snap = await store.getSnapshotJson();
    const agent = snap?.worldMap.occupants.find(
      (o): o is PreviewWorldMapAgentOccupantJson =>
        o.kind === "agent" && o.agentId === "agent-retry"
    );
    expect(agent).toBeDefined();
    expect(fanoutCount).toBe(1);
  });
});
