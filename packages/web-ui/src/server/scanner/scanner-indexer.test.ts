import { describe, expect, it } from "vitest";
import {
  indexPurchaseRecord,
  indexWalletBalance,
  getScannerTx,
} from "./scanner-indexer.js";
import { dailyMarketActivityKey } from "./daily-market-activity.js";
import { scannerSupplyKey, scannerTxKey, scannerTxsKey } from "./scanner-keys.js";

type Stored = {
  strings: Map<string, string>;
  zsets: Map<string, Map<string, number>>;
  hashes: Map<string, Map<string, string>>;
  lists: Map<string, string[]>;
};

const createMockRedis = (): Stored & {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<"OK">;
  zadd: (key: string, score: number, member: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
  incrby: (key: string, amount: number) => Promise<number>;
  hset: (key: string, row: Record<string, string>) => Promise<number>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  scan: (
    cursor: string,
    matchToken: "MATCH",
    pattern: string,
    countToken: "COUNT",
    count: number
  ) => Promise<[string, string[]]>;
  seedList: (key: string, rows: string[]) => void;
  multi: () => {
    set: (key: string, value: string) => void;
    zadd: (key: string, score: number, member: string) => void;
    hincrby: (key: string, field: string, increment: number) => void;
    hincrbyfloat: (key: string, field: string, increment: number) => void;
    exec: () => Promise<Array<[null, string]>>;
  };
} => {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();
  const lists = new Map<string, string[]>();
  return {
    strings,
    zsets,
    hashes,
    lists,
    seedList(key, rows) {
      lists.set(key, rows);
    },
    async get(key) {
      return strings.get(key) ?? null;
    },
    async set(key, value) {
      strings.set(key, value);
      return "OK";
    },
    async incr(key) {
      const next = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(next));
      return next;
    },
    async incrby(key, amount) {
      const next = Number(strings.get(key) ?? 0) + amount;
      strings.set(key, String(next));
      return next;
    },
    async hset(key, row) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      for (const [field, value] of Object.entries(row)) {
        bucket.set(field, value);
      }
      hashes.set(key, bucket);
      return 1;
    },
    async hgetall(key) {
      const bucket = hashes.get(key);
      if (bucket === undefined) return {};
      return Object.fromEntries(bucket.entries());
    },
    async lrange(key, start, stop) {
      const rows = lists.get(key) ?? [];
      if (stop === -1) {
        return rows.slice(start);
      }
      return rows.slice(start, stop + 1);
    },
    async zrangebyscore(
      key: string,
      min: string | number,
      max: string | number,
    ) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const maxScore = max === "+inf" ? Infinity : Number(max);
      return [...bucket.entries()]
        .filter(([, score]) => score >= minScore && score <= maxScore)
        .sort((a, b) => a[1] - b[1])
        .map(([member]) => member);
    },
    async scan(_cursor, _matchToken, pattern) {
      const regex = new RegExp(
        `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`
      );
      const keys = [...lists.keys()].filter((key) => regex.test(key));
      return ["0", keys];
    },
    multi() {
      const ops: Array<() => void> = [];
      return {
        set(key: string, value: string) {
          ops.push(() => {
            strings.set(key, value);
          });
        },
        zadd(key: string, score: number, member: string) {
          ops.push(() => {
            const bucket = zsets.get(key) ?? new Map<string, number>();
            bucket.set(member, score);
            zsets.set(key, bucket);
          });
        },
        hincrby(key: string, field: string, increment: number) {
          ops.push(() => {
            const bucket = hashes.get(key) ?? new Map<string, string>();
            bucket.set(field, String(Number(bucket.get(field) ?? 0) + increment));
            hashes.set(key, bucket);
          });
        },
        hincrbyfloat(key: string, field: string, increment: number) {
          ops.push(() => {
            const bucket = hashes.get(key) ?? new Map<string, string>();
            bucket.set(field, String(Number(bucket.get(field) ?? 0) + increment));
            hashes.set(key, bucket);
          });
        },
        async exec() {
          for (const op of ops) op();
          return ops.map(() => [null, "OK"] as [null, string]);
        },
      };
    },
  };
};

describe("scanner-indexer", () => {
  it("indexes purchase records idempotently", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const record = {
      id: "tx-1",
      playerId: "node-1",
      spaceId: "space-1",
      amenityKind: "shop" as const,
      itemRef: { kind: "shop" as const, id: "item-1" },
      priceUsd: 5,
      at: "2026-01-01T00:00:00.000Z",
    };

    await indexPurchaseRecord({ redis: redis as never, hostId, record });
    await indexPurchaseRecord({ redis: redis as never, hostId, record });

    const tx = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: "tx-1",
    });
    expect(tx?.id).toBe("tx-1");
    expect(redis.strings.get(scannerTxKey(hostId, "tx-1"))).toBeTruthy();
    expect(redis.zsets.get(scannerTxsKey(hostId))?.size).toBe(1);
    expect(
      redis.hashes.get(dailyMarketActivityKey(hostId))?.get("2026-01-01:ledgerTxCount"),
    ).toBe("1");
    expect(
      redis.hashes.get(dailyMarketActivityKey(hostId))?.get("2026-01-01:txCount"),
    ).toBeUndefined();
  });

  it("increments daily market activity for APU-related scanner rows", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const record = {
      id: "tx-apu",
      playerId: "node-1",
      spaceId: "space-1",
      amenityKind: "wallet_bundle" as const,
      itemRef: { kind: "bundle" as const, id: "bundle-1" },
      at: "2026-07-21T11:00:00.000Z",
      powerUpsDelta: 25,
      token: "APU" as const,
    };

    await indexPurchaseRecord({ redis: redis as never, hostId, record });

    expect(
      redis.hashes.get(dailyMarketActivityKey(hostId))?.get("2026-07-21:txCount"),
    ).toBe("1");
    expect(
      redis.hashes.get(dailyMarketActivityKey(hostId))?.get("2026-07-21:volumeApu"),
    ).toBe("25");
  });

  it("lazy-indexes a purchase found only on the player purchases list", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const record = {
      id: "36dde625-da2a-4ac6-b022-e15147627db5",
      playerId: "node-1",
      spaceId: "econext",
      amenityKind: "apu_credit" as const,
      itemRef: { kind: "apu" as const, id: "36dde625-da2a-4ac6-b022-e15147627db5" },
      priceUsd: 10,
      at: "2026-07-20T15:00:00.000Z",
      powerUpsDelta: 8,
      creditSource: "econext:trade",
      token: "APU" as const,
    };
    const purchasesKey = `agent-play:${hostId}:player:${record.playerId}:purchases`;
    redis.seedList(purchasesKey, [JSON.stringify(record)]);

    const tx = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: record.id,
    });
    expect(tx?.id).toBe(record.id);
    expect(tx?.op).toBe("applyGameOutcome");
    expect(redis.strings.get(scannerTxKey(hostId, record.id))).toBeTruthy();
  });

  it("enriches P2P SOL from detail and writes the row back", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const row = {
      id: "p2p-old",
      playerId: "seller-1",
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: "deal-1" },
      at: "2026-09-05T10:00:00.000Z",
      powerUpsDelta: -19,
      creditSource: "econext:p2p",
      token: "APU",
      detail: "P2P deal deal-1 sold 19 APU for 6523499 lamports (fee 815437)",
      hostId,
      indexedAt: "2026-09-05T10:00:00.000Z",
      op: "p2pSettle",
    };
    redis.strings.set(scannerTxKey(hostId, row.id), JSON.stringify(row));

    const tx = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: row.id,
    });
    expect(tx?.solLamportsDelta).toBe(5_708_062);
    expect(tx?.feeLamports).toBe(815_437);
    const stored = JSON.parse(
      redis.strings.get(scannerTxKey(hostId, row.id)) ?? "{}",
    ) as { solLamportsDelta?: number };
    expect(stored.solLamportsDelta).toBe(5_708_062);
  });

  it("recovers the P2P counterparty from the sibling journal row", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const at = "2026-09-05T10:28:38.610Z";
    const debit = {
      id: "p2p-debit",
      playerId: "seller-1",
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: "7047934a-274a-4ec2-8f02-5be46eea45c4" },
      at,
      powerUpsDelta: -19,
      creditSource: "econext:p2p",
      token: "APU",
      detail:
        "P2P deal 7047934a-274a-4ec2-8f02-5be46eea45c4 sold 19 APU for 6523499 lamports (fee 815437)",
      hostId,
      indexedAt: at,
      op: "p2pSettle",
    };
    const credit = {
      ...debit,
      id: "p2p-credit",
      playerId: "buyer-1",
      amenityKind: "apu_credit",
      powerUpsDelta: 19,
      detail:
        "P2P deal 7047934a-274a-4ec2-8f02-5be46eea45c4 bought 19 APU",
    };
    redis.strings.set(scannerTxKey(hostId, debit.id), JSON.stringify(debit));
    redis.strings.set(scannerTxKey(hostId, credit.id), JSON.stringify(credit));
    redis.zsets.set(
      scannerTxsKey(hostId),
      new Map([
        [debit.id, Date.parse(at)],
        [credit.id, Date.parse(at)],
      ]),
    );

    const tx = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: debit.id,
    });
    expect(tx?.counterpartyNodeId).toBe("buyer-1");
    expect(tx?.solLamportsDelta).toBe(5_708_062);

    const bought = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: credit.id,
    });
    expect(bought?.counterpartyNodeId).toBe("seller-1");
    expect(bought?.solLamportsDelta).toBe(-6_523_499);
  });

  it("write-throughs circulating APU by subtracting the previous wallet snapshot", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    await indexWalletBalance({
      redis: redis as never,
      hostId,
      wallet: {
        playerId: "node-1",
        balanceUsd: 10,
        powerUps: 40,
        updatedAt: "2026-07-21T11:00:00.000Z",
      },
    });
    await indexWalletBalance({
      redis: redis as never,
      hostId,
      wallet: {
        playerId: "node-1",
        balanceUsd: 8,
        powerUps: 55,
        updatedAt: "2026-07-21T12:00:00.000Z",
      },
    });
    await indexWalletBalance({
      redis: redis as never,
      hostId,
      wallet: {
        playerId: "node-2",
        balanceUsd: 4,
        powerUps: 10,
        updatedAt: "2026-07-21T12:00:00.000Z",
      },
    });

    const supply = redis.hashes.get(scannerSupplyKey(hostId));
    expect(supply?.get("circulatingApu")).toBe("65");
    expect(supply?.get("marketUsd")).toBe("12");
    expect(supply?.get("walletCount")).toBe("2");
  });
});
