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

    const wallet = ScannerWalletSnapshotSchema.parse({
      playerId: "node-1",
      balanceUsd: 10,
      powerUps: 15,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(wallet.balanceUsd).toBe(10);
  });
});
