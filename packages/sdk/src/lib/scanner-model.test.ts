import { describe, expect, it } from "vitest";
import {
  ScannerBlockRecordSchema,
  ScannerHeadSchema,
  ScannerMigrationStateSchema,
  ScannerTxRecordSchema,
  ScannerWalletSnapshotSchema,
} from "./scanner-model.js";

describe("scanner-model", () => {
  it("parses a scanner tx record with explorer metadata", () => {
    const row = ScannerTxRecordSchema.parse({
      id: "tx-1",
      playerId: "node-1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 5,
      at: "2026-01-01T00:00:00.000Z",
      hostId: "default",
      indexedAt: "2026-01-01T00:00:01.000Z",
      op: "purchase",
      blockRev: 12,
      merkleRootHex: "abc123",
    });
    expect(row.op).toBe("purchase");
    expect(row.hostId).toBe("default");
  });

  it("parses block and migration state records", () => {
    const block = ScannerBlockRecordSchema.parse({
      rev: 3,
      merkleRootHex: "deadbeef",
      merkleLeafCount: 8,
      at: "2026-01-01T00:00:00.000Z",
      leafDeltaCount: 2,
    });
    expect(block.rev).toBe(3);

    const migration = ScannerMigrationStateSchema.parse({
      status: "completed",
      cursor: "done",
      totalIndexed: 42,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:01:00.000Z",
    });
    expect(migration.status).toBe("completed");
  });

  it("parses scanner head and wallet snapshot", () => {
    const head = ScannerHeadSchema.parse({
      generatedAt: "2026-01-01T00:00:00.000Z",
      hostId: "default",
      snapshotRev: 5,
      merkleRootHex: "ff",
      merkleLeafCount: 4,
      sid: "sid-1",
      txsLast24h: 10,
      apuMintedLast24h: 30,
      apuBurnedLast24h: 5,
      migrationStatus: "completed",
    });
    expect(head.txsLast24h).toBe(10);
    expect(head.txsToday).toBe(0);
    expect(head.volumeSol7d).toBe(0);
    expect(head.bySource.p2p).toBe(0);

    const wallet = ScannerWalletSnapshotSchema.parse({
      playerId: "node-1",
      balanceUsd: 10,
      powerUps: 15,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(wallet.balanceUsd).toBe(10);
  });

  it("parses a P2P scanner row with p2pSettle op and SOL fields", () => {
    const row = ScannerTxRecordSchema.parse({
      id: "p2p-debit-1",
      playerId: "seller-1",
      spaceId: "econext-p2p",
      amenityKind: "apu_debit",
      itemRef: { kind: "apu", id: "deal-1" },
      at: "2026-09-05T12:00:00.000Z",
      powerUpsDelta: -40,
      creditSource: "econext:p2p",
      token: "APU",
      solLamportsDelta: 396_000_000,
      feeLamports: 4_000_000,
      hostId: "default",
      indexedAt: "2026-09-05T12:00:00.000Z",
      op: "p2pSettle",
    });
    expect(row.op).toBe("p2pSettle");
    expect(row.solLamportsDelta).toBe(396_000_000);
  });

  it("parses scanner head market and SOL totals", () => {
    const head = ScannerHeadSchema.parse({
      generatedAt: "2026-09-05T12:00:00.000Z",
      hostId: "default",
      snapshotRev: 5,
      merkleRootHex: null,
      merkleLeafCount: null,
      sid: null,
      txsLast24h: 2,
      apuMintedLast24h: 0,
      apuBurnedLast24h: 0,
      migrationStatus: "completed",
      txsToday: 2,
      txs7d: 10,
      txs30d: 40,
      txsAllTime: 100,
      volumeApuToday: 40,
      volumeApu7d: 200,
      volumeApu30d: 800,
      volumeSolToday: 396_000_000,
      volumeSol7d: 1_000_000_000,
      volumeSol30d: 2_000_000_000,
      p2pSettlements7d: 3,
      p2pVolumeSol7d: 1_188_000_000,
      feeSol7d: 12_000_000,
      marketCapApw: 1200,
      circulatingApu: 5000,
      escrowedApu: 80,
      openP2pOrders: 4,
      bySource: {
        amenity: 1,
        arcade: 2,
        talk: 0,
        trade: 3,
        transfer: 2,
        p2p: 4,
        sol: 1,
      },
    });
    expect(head.volumeSol7d).toBe(1_000_000_000);
    expect(head.p2pSettlements7d).toBe(3);
    expect(head.bySource.sol).toBe(1);
  });

  it("defaults longer range totals on scanner head", () => {
    const head = ScannerHeadSchema.parse({
      generatedAt: "2026-09-05T12:00:00.000Z",
      hostId: "default",
      snapshotRev: 1,
      merkleRootHex: null,
      merkleLeafCount: null,
      sid: null,
      txsLast24h: 0,
      apuMintedLast24h: 0,
      apuBurnedLast24h: 0,
      migrationStatus: "completed",
      txs90d: 12,
      txs6mo: 20,
      txs1y: 40,
      txs5y: 80,
      volumeApu90d: 90,
      volumeSol1y: 3_000_000_000,
      apwPerApu: 0.0664875,
    });
    expect(head.txs90d).toBe(12);
    expect(head.txs6mo).toBe(20);
    expect(head.txs1y).toBe(40);
    expect(head.txs5y).toBe(80);
    expect(head.volumeApu90d).toBe(90);
    expect(head.volumeSol1y).toBe(3_000_000_000);
    expect(head.apwPerApu).toBe(0.0664875);
    expect(head.bySource90d.p2p).toBe(0);
  });
});
