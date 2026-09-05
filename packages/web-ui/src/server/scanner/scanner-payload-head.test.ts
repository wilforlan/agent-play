import { describe, expect, it, vi } from "vitest";
import { dailyMarketActivityKey } from "./daily-market-activity.js";
import {
  apwPerApuRateKey,
  econextAccountKey,
  marketCapCacheKey,
  marketCapSnapshotsKey,
  p2pEscrowedApuTotalKey,
  p2pOpenOrdersKey,
  playerWalletKey,
  scannerSupplyKey,
  scannerTxKey,
  scannerTxsKey,
} from "./scanner-keys.js";

vi.mock("./scanner-backfill.js", () => ({
  ensureScannerBackfillStarted: (): void => undefined,
  readScannerMigrationState: async () => ({
    status: "completed",
    cursor: "done",
    totalIndexed: 5002,
    startedAt: "2026-07-21T00:00:00.000Z",
    completedAt: "2026-07-21T00:00:01.000Z",
  }),
}));

import { buildScannerHead, listScannerTxs } from "./scanner-payload.js";

type MockRedis = {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  zsets: Map<string, Map<string, number>>;
  zrangebyscoreCalls: number;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...extra: Array<string | number>) => Promise<"OK">;
  hgetall: (key: string) => Promise<Record<string, string>>;
  hset: (key: string, field: string | Record<string, string>, value?: string) => Promise<number>;
  mget: (...keys: string[]) => Promise<Array<string | null>>;
  scan: (
    cursor: string,
    matchKeyword: string,
    pattern: string,
    countKeyword?: string,
    count?: number,
  ) => Promise<[string, string[]]>;
  zcard: (key: string) => Promise<number>;
  zscore: (key: string, member: string) => Promise<string | null>;
  zrevrange: (key: string, start: number, stop: number) => Promise<string[]>;
  zrangebyscore: (
    key: string,
    min: string | number,
    max: string | number,
    limitKeyword?: string,
    offset?: number,
    count?: number
  ) => Promise<string[]>;
};

const createMockRedis = (): MockRedis => {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();
  return {
    strings,
    hashes,
    zsets,
    zrangebyscoreCalls: 0,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async set(key, value) {
      strings.set(key, value);
      return "OK";
    },
    async hgetall(key) {
      const bucket = hashes.get(key);
      return bucket === undefined ? {} : Object.fromEntries(bucket.entries());
    },
    async hset(key, field, value) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      if (typeof field === "string") {
        bucket.set(field, value ?? "");
      } else {
        for (const [name, next] of Object.entries(field)) {
          bucket.set(name, next);
        }
      }
      hashes.set(key, bucket);
      return 1;
    },
    async mget(...keys) {
      return keys.map((key) => strings.get(key) ?? null);
    },
    async scan(_cursor, _matchKeyword, pattern) {
      const regex = new RegExp(
        `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
      );
      const keys = [
        ...strings.keys(),
        ...hashes.keys(),
        ...zsets.keys(),
      ].filter((key) => regex.test(key));
      return ["0", keys];
    },
    async zcard(key) {
      return zsets.get(key)?.size ?? 0;
    },
    async zscore(key, member) {
      const score = zsets.get(key)?.get(member);
      return score !== undefined ? String(score) : null;
    },
    async zrevrange(key, start, stop) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      return [...bucket.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(start, stop + 1)
        .map(([member]) => member);
    },
    async zrangebyscore(key, min, max, limitKeyword, offset, count) {
      this.zrangebyscoreCalls += 1;
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const maxScore = max === "+inf" ? Infinity : Number(max);
      const sorted = [...bucket.entries()]
        .filter(([, score]) => score >= minScore && score <= maxScore)
        .sort((a, b) => a[1] - b[1]);
      if (limitKeyword === "LIMIT" && offset !== undefined && count !== undefined) {
        return sorted.slice(offset, offset + count).map(([member]) => member);
      }
      return sorted.map(([member]) => member);
    },
  };
};

const NOW_MS = Date.parse("2026-07-21T18:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("buildScannerHead", () => {
  it("sums Today/7D/30D from the daily hash without walking the journal", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.hashes.set(
      dailyMarketActivityKey(hostId),
      new Map([
        ["2026-07-21:ledgerTxCount", "5002"],
        ["2026-07-21:txCount", "5001"],
        ["2026-07-21:volumeApu", "200040"],
        ["2026-07-21:volumeSolLamports", "2001400000000"],
        ["2026-07-21:p2pDealCount", "5001"],
        ["2026-07-21:p2pVolumeSolLamports", "2000400000000"],
        ["2026-07-21:feeSolLamports", "20004000000"],
        ["2026-07-21:source:p2p", "5001"],
        ["2026-07-21:source:sol", "1"],
      ]),
    );
    const journal = new Map<string, number>();
    for (let i = 0; i < 5001; i += 1) {
      journal.set(`p2p-${i}`, NOW_MS);
    }
    journal.set("sol-deposit-1", NOW_MS);
    redis.zsets.set(scannerTxsKey(hostId), journal);
    redis.strings.set(marketCapCacheKey(hostId), "128.5");
    redis.hashes.set(
      scannerSupplyKey(hostId),
      new Map([
        ["circulatingApu", "900"],
        ["marketUsd", "40"],
        ["walletCount", "3"],
      ]),
    );
    redis.strings.set(p2pEscrowedApuTotalKey(hostId), "120");
    redis.zsets.set(p2pOpenOrdersKey(hostId), new Map([["order-1", 1]]));

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.txsToday).toBe(5002);
    expect(head.txs7d).toBe(5002);
    expect(head.txs30d).toBe(5002);
    expect(head.txsAllTime).toBe(5002);
    expect(head.volumeApuToday).toBe(200040);
    expect(head.volumeSolToday).toBe(2001400000000);
    expect(head.p2pSettlements7d).toBe(5001);
    expect(head.p2pVolumeSol7d).toBe(2000400000000);
    expect(head.feeSol7d).toBe(20004000000);
    expect(head.marketCapApw).toBe(128.5);
    expect(head.circulatingApu).toBe(900);
    expect(head.escrowedApu).toBe(120);
    expect(head.openP2pOrders).toBe(1);
    expect(head.bySource.p2p).toBe(5001);
    expect(head.bySource.sol).toBe(1);
    expect(head.bySourceToday.p2p).toBe(5001);
    expect(head.txs90d).toBe(5002);
    expect(head.txs5y).toBe(5002);
    expect(redis.zrangebyscoreCalls).toBe(0);
  });

  it("falls back to txCount when ledgerTxCount is missing", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.hashes.set(
      dailyMarketActivityKey(hostId),
      new Map([
        ["2026-07-21:txCount", "2"],
        ["2026-07-21:volumeApu", "19"],
      ]),
    );
    redis.zsets.set(scannerTxsKey(hostId), new Map([["p2p-1", NOW_MS]]));

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.txsToday).toBe(2);
    expect(head.txs7d).toBe(2);
    expect(head.txs30d).toBe(2);
    expect(head.volumeApuToday).toBe(19);
  });

  it("fills SOL volume and source chips from enriched journal rows", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.hashes.set(
      dailyMarketActivityKey(hostId),
      new Map([
        ["2026-07-21:txCount", "1"],
        ["2026-07-21:volumeApu", "19"],
      ]),
    );
    const row = {
      id: "p2p-live",
      playerId: "seller-1",
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: "7047934a-274a-4ec2-8f02-5be46eea45c4" },
      at: "2026-07-21T11:00:00.000Z",
      powerUpsDelta: -19,
      creditSource: "econext:p2p",
      token: "APU",
      detail:
        "P2P deal 7047934a-274a-4ec2-8f02-5be46eea45c4 sold 19 APU for 6523499 lamports (fee 815437)",
      hostId,
      indexedAt: "2026-07-21T11:00:00.000Z",
      op: "p2pSettle",
    };
    redis.strings.set(scannerTxKey(hostId, row.id), JSON.stringify(row));
    redis.zsets.set(scannerTxsKey(hostId), new Map([[row.id, Date.parse(row.at)]]));

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.volumeSolToday).toBe(6_523_499);
    expect(head.bySourceToday.p2p).toBe(1);
  });

  it("includes a five-year-old day in the 5y totals", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.hashes.set(
      dailyMarketActivityKey(hostId),
      new Map([
        ["2021-07-21:txCount", "11"],
        ["2021-07-21:volumeApu", "40"],
        ["2026-07-21:txCount", "3"],
        ["2026-07-21:volumeApu", "9"],
      ]),
    );

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.txsToday).toBe(3);
    expect(head.txs1y).toBe(3);
    expect(head.txs5y).toBe(14);
    expect(head.volumeApu5y).toBe(49);
  });

  it("reads APW$ cap from snapshots when the live cache is empty", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.hashes.set(
      marketCapSnapshotsKey(hostId),
      new Map([
        ["2026-07-20", JSON.stringify({ atMs: NOW_MS - DAY_MS, marketCapApw: 900 })],
        ["2026-07-21", JSON.stringify({ atMs: NOW_MS, marketCapApw: 1280 })],
      ]),
    );

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.marketCapApw).toBe(1280);
  });

  it("rebuilds circulating APU from Play wallets and leftover Econext accounts", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    redis.strings.set(
      playerWalletKey(hostId, "node-a"),
      JSON.stringify({
        playerId: "node-a",
        balanceUsd: 4,
        powerUps: 25,
        currency: "USD",
        updatedAt: "2026-07-21T00:00:00.000Z",
      }),
    );
    redis.strings.set(
      econextAccountKey(hostId, "node-a"),
      JSON.stringify({ nodeId: "node-a", bankableApu: 10 }),
    );
    redis.strings.set(
      econextAccountKey(hostId, "node-b"),
      JSON.stringify({ nodeId: "node-b", bankableApu: 7 }),
    );
    redis.strings.set(apwPerApuRateKey(hostId), "0.0664875");

    const head = await buildScannerHead({
      redis: redis as never,
      hostId,
      nowMs: NOW_MS,
    });

    expect(head.circulatingApu).toBe(32);
    expect(head.apwPerApu).toBe(0.0664875);
    expect(redis.hashes.get(scannerSupplyKey(hostId))?.get("circulatingApu")).toBe(
      "32",
    );
  });
});

describe("listScannerTxs filters", () => {
  it("filters token=SOL and source=p2p from indexed rows", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const rows = [
      {
        id: "shop-1",
        playerId: "node-1",
        spaceId: "space-1",
        amenityKind: "shop",
        itemRef: { kind: "shop", id: "item-1" },
        priceUsd: 5,
        at: "2026-07-21T10:00:00.000Z",
        hostId,
        indexedAt: "2026-07-21T10:00:00.000Z",
        op: "purchase",
      },
      {
        id: "p2p-1",
        playerId: "seller-1",
        spaceId: "econext-p2p",
        amenityKind: "apu_debit",
        itemRef: { kind: "apu", id: "p2p-1" },
        at: "2026-07-21T11:00:00.000Z",
        powerUpsDelta: -40,
        solLamportsDelta: 396_000_000,
        feeLamports: 4_000_000,
        creditSource: "econext:p2p",
        token: "APU",
        hostId,
        indexedAt: "2026-07-21T11:00:00.000Z",
        op: "p2pSettle",
      },
      {
        id: "sol-1",
        playerId: "node-2",
        spaceId: "econext",
        amenityKind: "sol_deposit",
        itemRef: { kind: "sol", id: "sig-1" },
        at: "2026-07-21T12:00:00.000Z",
        solLamportsDelta: 1_000_000_000,
        token: "SOL",
        hostId,
        indexedAt: "2026-07-21T12:00:00.000Z",
        op: "solDeposit",
      },
    ];
    const journal = new Map<string, number>();
    for (const row of rows) {
      redis.strings.set(scannerTxKey(hostId, row.id), JSON.stringify(row));
      journal.set(row.id, Date.parse(row.at));
    }
    redis.zsets.set(scannerTxsKey(hostId), journal);

    const solPage = await listScannerTxs({
      redis: redis as never,
      hostId,
      limit: 25,
      token: "SOL",
    });
    expect(solPage.txs.map((tx) => tx.id)).toEqual(["sol-1", "p2p-1"]);

    const p2pPage = await listScannerTxs({
      redis: redis as never,
      hostId,
      limit: 25,
      source: "p2p",
    });
    expect(p2pPage.txs.map((tx) => tx.id)).toEqual(["p2p-1"]);
  });

  it("enriches listed P2P rows from deal detail", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const row = {
      id: "p2p-live",
      playerId: "seller-1",
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: "7047934a-274a-4ec2-8f02-5be46eea45c4" },
      at: "2026-07-21T11:00:00.000Z",
      powerUpsDelta: -19,
      creditSource: "econext:p2p",
      token: "APU",
      detail:
        "P2P deal 7047934a-274a-4ec2-8f02-5be46eea45c4 sold 19 APU for 6523499 lamports (fee 815437)",
      hostId,
      indexedAt: "2026-07-21T11:00:00.000Z",
      op: "p2pSettle",
    };
    redis.strings.set(scannerTxKey(hostId, row.id), JSON.stringify(row));
    redis.zsets.set(scannerTxsKey(hostId), new Map([[row.id, Date.parse(row.at)]]));

    const page = await listScannerTxs({
      redis: redis as never,
      hostId,
      limit: 25,
    });
    expect(page.txs[0]?.solLamportsDelta).toBe(5_708_062);
  });
});
