import { describe, expect, it } from "vitest";
import {
  APU_TOKEN,
  buildAmenityPurchaseApuFields,
  buildApuWalletTransaction,
  buildWalletBundleApuFields,
} from "./wallet-apu-transaction.js";
import { PurchaseRecordSchema } from "./space-content-model.js";

describe("wallet-apu-transaction", () => {
  it("builds an APU credit transaction with node and source metadata", () => {
    const record = buildApuWalletTransaction({
      id: "apu-1",
      playerId: "node-main",
      spaceId: "__arcade__",
      delta: 12,
      at: "2026-06-10T12:00:00.000Z",
      creditSource: "game:hidden-gems",
      itemRef: { kind: "game", id: "hidden-gems" },
      detail: "Arcade round round-1",
    });
    expect(PurchaseRecordSchema.safeParse(record).success).toBe(true);
    expect(record.amenityKind).toBe("apu_credit");
    expect(record.powerUpsEarned).toBe(12);
    expect(record.powerUpsDelta).toBe(12);
    expect(record.creditSource).toBe("game:hidden-gems");
    expect(record.token).toBe(APU_TOKEN);
    expect(record.playerId).toBe("node-main");
  });

  it("builds an APU debit transaction", () => {
    const record = buildApuWalletTransaction({
      id: "apu-2",
      playerId: "node-main",
      spaceId: "__wallet__",
      delta: -150,
      at: "2026-06-10T12:00:00.000Z",
      debitSource: "wallet:apu",
      creditSource: "wallet:usd",
      itemRef: { kind: "bundle", id: "bundle-10" },
      detail: "Redeemed 150 APU for $10 balance",
    });
    expect(record.amenityKind).toBe("apu_debit");
    expect(record.powerUpsSpent).toBe(150);
    expect(record.powerUpsDelta).toBe(-150);
    expect(record.debitSource).toBe("wallet:apu");
  });

  it("adds APU earn fields to amenity purchase rows", () => {
    const fields = buildAmenityPurchaseApuFields({
      amenityKind: "shop",
      spaceId: "space-1",
      earnedPowerUps: 27,
    });
    expect(fields.powerUpsEarned).toBe(27);
    expect(fields.creditSource).toBe("amenity:shop:space-1");
    expect(fields.debitSource).toBe("wallet:usd");
    expect(fields.token).toBe(APU_TOKEN);
  });

  it("adds APU spend fields to wallet bundle rows", () => {
    const fields = buildWalletBundleApuFields({
      bundleId: "bundle-100",
      powerUpsCost: 900,
    });
    expect(fields.powerUpsSpent).toBe(900);
    expect(fields.powerUpsDelta).toBe(-900);
    expect(fields.debitSource).toBe("wallet:apu");
    expect(fields.creditSource).toBe("wallet:usd:bundle:bundle-100");
    expect(fields.token).toBe(APU_TOKEN);
  });
});
