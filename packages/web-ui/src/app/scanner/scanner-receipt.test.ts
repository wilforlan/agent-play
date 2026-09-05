import { describe, expect, it } from "vitest";
import { ScannerTxRecordSchema } from "@agent-play/sdk";
import { apuWalletsFromTx } from "./scanner-receipt.js";

const getMockTx = (
  overrides?: Partial<ReturnType<typeof ScannerTxRecordSchema.parse>>,
) =>
  ScannerTxRecordSchema.parse({
    id: "p2p-1",
    playerId: "seller-1",
    spaceId: "econext-p2p",
    amenityKind: "apu_debit",
    itemRef: { kind: "apu", id: "deal-1" },
    at: "2026-09-05T10:00:00.000Z",
    powerUpsDelta: -19,
    creditSource: "econext:p2p",
    token: "APU",
    hostId: "default",
    indexedAt: "2026-09-05T10:00:00.000Z",
    op: "p2pSettle",
    ...overrides,
  });

describe("apuWalletsFromTx", () => {
  it("maps a P2P debit from seller to buyer", () => {
    expect(
      apuWalletsFromTx(
        getMockTx({
          playerId: "seller-1",
          counterpartyNodeId: "buyer-1",
          amenityKind: "apu_debit",
        }),
      ),
    ).toEqual({ from: "seller-1", to: "buyer-1" });
  });

  it("maps a P2P credit from seller to buyer", () => {
    expect(
      apuWalletsFromTx(
        getMockTx({
          playerId: "buyer-1",
          counterpartyNodeId: "seller-1",
          amenityKind: "apu_credit",
        }),
      ),
    ).toEqual({ from: "seller-1", to: "buyer-1" });
  });

  it("falls back to the node when no counterparty exists", () => {
    expect(apuWalletsFromTx(getMockTx())).toEqual({
      from: "seller-1",
      to: null,
    });
  });
});
