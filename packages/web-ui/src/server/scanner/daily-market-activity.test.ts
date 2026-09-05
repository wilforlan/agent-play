import { describe, expect, it } from "vitest";
import { ScannerTxRecordSchema, type ScannerTxRecord } from "@agent-play/sdk";
import {
  activityIncrementFromScannerTx,
  dailyMarketActivityKey,
  ledgerTxsFromDay,
  parseDailyMarketActivityHash,
  queueDailyMarketActivityIncrement,
} from "./daily-market-activity.js";

const getMockScannerTx = (
  overrides?: Partial<ScannerTxRecord>,
): ScannerTxRecord =>
  ScannerTxRecordSchema.parse({
    id: "tx-1",
    playerId: "node-a",
    spaceId: "space-1",
    amenityKind: "apu_credit",
    itemRef: { kind: "apu", id: "credit-1" },
    at: "2026-07-21T11:00:00.000Z",
    powerUpsDelta: 100,
    token: "APU",
    hostId: "default",
    indexedAt: "2026-07-21T11:00:00.000Z",
    op: "applyGameOutcome",
    ...overrides,
  });

describe("ledgerTxsFromDay", () => {
  it("uses ledgerTxCount when present, otherwise txCount", () => {
    expect(ledgerTxsFromDay({ ledgerTxCount: 4, txCount: 2 })).toBe(4);
    expect(ledgerTxsFromDay({ ledgerTxCount: 0, txCount: 2 })).toBe(2);
  });
});

describe("scanner daily market activity increments", () => {
  it("counts P2P debit once for APU volume, SOL volume, and deal count", () => {
    expect(
      activityIncrementFromScannerTx(
        getMockScannerTx({
          amenityKind: "apu_debit",
          creditSource: "econext:p2p",
          spaceId: "econext-p2p",
          powerUpsDelta: -40,
          solLamportsDelta: 396_000_000,
          feeLamports: 4_000_000,
          op: "p2pSettle",
        }),
      ),
    ).toMatchObject({
      txCount: 1,
      ledgerTxCount: 1,
      volumeApu: 40,
      volumeSolLamports: 400_000_000,
      feeSolLamports: 4_000_000,
      p2pDealCount: 1,
      source: "p2p",
    });
  });

  it("counts a SOL deposit toward ledger and SOL volume only", () => {
    expect(
      activityIncrementFromScannerTx(
        getMockScannerTx({
          amenityKind: "sol_deposit",
          itemRef: { kind: "sol", id: "sig-1" },
          token: "SOL",
          powerUpsDelta: undefined,
          solLamportsDelta: 1_000_000_000,
          op: "solDeposit",
        }),
      ),
    ).toMatchObject({
      txCount: 0,
      ledgerTxCount: 1,
      volumeApu: 0,
      volumeSolLamports: 1_000_000_000,
      source: "sol",
    });
  });

  it("writes SOL volume onto the daily hash", () => {
    const hashes = new Map<string, Map<string, string>>();
    const redis = {
      hincrby(key: string, field: string, increment: number) {
        const hash = hashes.get(key) ?? new Map<string, string>();
        hash.set(field, String(Number(hash.get(field) ?? 0) + increment));
        hashes.set(key, hash);
      },
      hincrbyfloat(key: string, field: string, increment: number) {
        const hash = hashes.get(key) ?? new Map<string, string>();
        hash.set(field, String(Number(hash.get(field) ?? 0) + increment));
        hashes.set(key, hash);
      },
    };

    queueDailyMarketActivityIncrement(redis, {
      hostId: "default",
      tx: getMockScannerTx({
        amenityKind: "apu_debit",
        creditSource: "econext:p2p",
        spaceId: "econext-p2p",
        powerUpsDelta: -40,
        solLamportsDelta: 396_000_000,
        feeLamports: 4_000_000,
        op: "p2pSettle",
      }),
    });

    const listed = parseDailyMarketActivityHash({
      raw: Object.fromEntries(
        hashes.get(dailyMarketActivityKey("default"))?.entries() ?? [],
      ),
      sinceMs: Date.parse("2026-07-01T00:00:00.000Z"),
    });

    expect(listed[0]?.volumeSolLamports).toBe(400_000_000);
    expect(listed[0]?.p2pDealCount).toBe(1);
    expect(listed[0]?.sourceCounts.p2p).toBe(1);
  });
});
