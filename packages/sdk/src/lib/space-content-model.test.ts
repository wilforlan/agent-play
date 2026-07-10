import { describe, expect, it } from "vitest";
import {
  CarWashCarSchema,
  DEFAULT_PLAYER_WALLET_BALANCE_USD,
  PlayerWalletSchema,
  PurchaseRecordSchema,
  SaleStateSchema,
  ShopItemSchema,
  SupermarketItemSchema,
  createInitialPlayerWallet,
  createInitialAgentRewardWallet,
  desaturateColor,
  isItemAvailableForPurchase,
} from "./space-content-model.js";

describe("space-content-model: SaleStateSchema", () => {
  it("accepts the default available state", () => {
    const parsed = SaleStateSchema.parse({ status: "available" });
    expect(parsed.status).toBe("available");
  });

  it("accepts a sold state with buyer and timestamp", () => {
    const parsed = SaleStateSchema.parse({
      status: "sold",
      soldToPlayerId: "player-1",
      soldAt: "2026-05-12T00:00:00.000Z",
    });
    expect(parsed.status).toBe("sold");
    expect(parsed.soldToPlayerId).toBe("player-1");
  });

  it("rejects unknown statuses", () => {
    const result = SaleStateSchema.safeParse({ status: "pending" });
    expect(result.success).toBe(false);
  });
});

describe("space-content-model: ShopItemSchema", () => {
  it("accepts a valid book item with default available sale state", () => {
    const parsed = ShopItemSchema.parse({
      id: "item-1",
      spaceId: "space-1",
      type: "book",
      name: "Hitchhiker's Guide",
      description: "Don't panic",
      priceUsd: 12.5,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(parsed.type).toBe("book");
    expect(parsed.sale.status).toBe("available");
  });

  it("accepts coffee and music types", () => {
    expect(
      ShopItemSchema.parse({
        id: "i",
        spaceId: "s",
        type: "music",
        name: "n",
        description: "d",
        priceUsd: 1,
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: { status: "available" },
      }).type
    ).toBe("music");
    expect(
      ShopItemSchema.parse({
        id: "i",
        spaceId: "s",
        type: "coffee",
        name: "n",
        description: "d",
        priceUsd: 1,
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: { status: "available" },
      }).type
    ).toBe("coffee");
  });

  it("rejects negative or zero prices", () => {
    const result = ShopItemSchema.safeParse({
      id: "i",
      spaceId: "s",
      type: "book",
      name: "n",
      description: "d",
      priceUsd: -1,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(result.success).toBe(false);
  });
});

describe("space-content-model: SupermarketItemSchema", () => {
  it("accepts row + column within bounds", () => {
    const parsed = SupermarketItemSchema.parse({
      id: "i",
      spaceId: "s",
      row: 2,
      column: 3,
      name: "Apple",
      description: "fresh",
      priceUsd: 1.25,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(parsed.row).toBe(2);
    expect(parsed.column).toBe(3);
  });

  it("rejects row 5 (outside 1..4)", () => {
    const result = SupermarketItemSchema.safeParse({
      id: "i",
      spaceId: "s",
      row: 5,
      column: 1,
      name: "n",
      description: "d",
      priceUsd: 1,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects column 6 (outside 1..5)", () => {
    const result = SupermarketItemSchema.safeParse({
      id: "i",
      spaceId: "s",
      row: 1,
      column: 6,
      name: "n",
      description: "d",
      priceUsd: 1,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(result.success).toBe(false);
  });
});

describe("space-content-model: CarWashCarSchema", () => {
  it("accepts a valid car with slot 1..9", () => {
    const parsed = CarWashCarSchema.parse({
      id: "c",
      spaceId: "s",
      slot: 5,
      name: "Mustang",
      model: "GT",
      year: 2023,
      priceUsd: 45000,
      colorHex: "#ff0000",
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(parsed.slot).toBe(5);
    expect(parsed.colorHex).toBe("#ff0000");
  });

  it("rejects slot 0 and slot 10", () => {
    expect(
      CarWashCarSchema.safeParse({
        id: "c",
        spaceId: "s",
        slot: 0,
        name: "n",
        model: "m",
        year: 2020,
        priceUsd: 1,
        colorHex: "#000000",
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: { status: "available" },
      }).success
    ).toBe(false);
    expect(
      CarWashCarSchema.safeParse({
        id: "c",
        spaceId: "s",
        slot: 10,
        name: "n",
        model: "m",
        year: 2020,
        priceUsd: 1,
        colorHex: "#000000",
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: { status: "available" },
      }).success
    ).toBe(false);
  });

  it("rejects malformed colorHex", () => {
    expect(
      CarWashCarSchema.safeParse({
        id: "c",
        spaceId: "s",
        slot: 1,
        name: "n",
        model: "m",
        year: 2020,
        priceUsd: 1,
        colorHex: "red",
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: { status: "available" },
      }).success
    ).toBe(false);
  });
});

describe("space-content-model: PlayerWalletSchema + factory", () => {
  it("DEFAULT_PLAYER_WALLET_BALANCE_USD is exactly 70", () => {
    expect(DEFAULT_PLAYER_WALLET_BALANCE_USD).toBe(70);
  });

  it("createInitialPlayerWallet returns balance 70 in USD", () => {
    const now = "2026-05-12T00:00:00.000Z";
    const wallet = createInitialPlayerWallet({ playerId: "p1", now });
    expect(wallet.playerId).toBe("p1");
    expect(wallet.balanceUsd).toBe(DEFAULT_PLAYER_WALLET_BALANCE_USD);
    expect(wallet.balanceUsd).toBe(70);
    expect(wallet.currency).toBe("USD");
    expect(wallet.updatedAt).toBe(now);
    expect(wallet.powerUps).toBe(0);
  });

  it("PlayerWalletSchema defaults powerUps to 0 when omitted (legacy JSON)", () => {
    const parsed = PlayerWalletSchema.parse({
      playerId: "p-legacy",
      balanceUsd: 70,
      currency: "USD",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    expect(parsed.powerUps).toBe(0);
  });
  it("PlayerWalletSchema validates the factory output", () => {
    const wallet = createInitialPlayerWallet({
      playerId: "p1",
      now: "2026-05-12T00:00:00.000Z",
    });
    expect(() => PlayerWalletSchema.parse(wallet)).not.toThrow();
  });

  it("createInitialAgentRewardWallet seeds zero USD and zero power-ups", () => {
    const now = "2026-05-12T00:00:00.000Z";
    const w = createInitialAgentRewardWallet({ playerId: "agent-1", now });
    expect(w.balanceUsd).toBe(0);
    expect(w.powerUps).toBe(0);
    expect(w.playerId).toBe("agent-1");
    expect(() => PlayerWalletSchema.parse(w)).not.toThrow();
  });
});

describe("space-content-model: PurchaseRecordSchema", () => {
  it("accepts a shop purchase record", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "rec-1",
      playerId: "p1",
      spaceId: "s1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 9.99,
      at: "2026-05-12T00:00:00.000Z",
    });
    expect(parsed.itemRef.kind).toBe("shop");
  });

  it("accepts a talk-time billing audit row with optional detail", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "talk-1",
      playerId: "node-1",
      spaceId: "__talk__",
      amenityKind: "talk_time",
      itemRef: { kind: "shop", id: "openai-realtime" },
      priceUsd: 0.25,
      at: "2026-05-12T00:00:00.000Z",
      detail: "Realtime voice · 10s · agent a1",
    });
    expect(parsed.amenityKind).toBe("talk_time");
    expect(parsed.detail).toBe("Realtime voice · 10s · agent a1");
  });

  it("accepts legacy purchase records without detail", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "rec-1",
      playerId: "p1",
      spaceId: "s1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 9.99,
      at: "2026-05-12T00:00:00.000Z",
    });
    expect(parsed.detail).toBeUndefined();
  });

  it("accepts a wallet_bundle record with powerUpsSpent", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "wb-1",
      playerId: "p1",
      spaceId: "__wallet__",
      amenityKind: "wallet_bundle",
      itemRef: { kind: "shop", id: "bundle-100" },
      priceUsd: 100,
      at: "2026-05-12T00:00:00.000Z",
      detail: "Exchanged 900 power-ups for $100 balance",
      powerUpsSpent: 900,
    });
    expect(parsed.amenityKind).toBe("wallet_bundle");
    expect(parsed.powerUpsSpent).toBe(900);
  });

  it("accepts wallet_bundle without optional powerUpsSpent", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "wb-2",
      playerId: "p1",
      spaceId: "__wallet__",
      amenityKind: "wallet_bundle",
      itemRef: { kind: "shop", id: "bundle-10" },
      priceUsd: 10,
      at: "2026-05-12T00:00:00.000Z",
    });
    expect(parsed.powerUpsSpent).toBeUndefined();
  });

  it("accepts an apu_credit transaction without priceUsd", () => {
    const parsed = PurchaseRecordSchema.parse({
      id: "apu-1",
      playerId: "node-1",
      spaceId: "__arcade__",
      amenityKind: "apu_credit",
      itemRef: { kind: "game", id: "hidden-gems" },
      at: "2026-05-12T00:00:00.000Z",
      powerUpsEarned: 12,
      powerUpsDelta: 12,
      creditSource: "game:hidden-gems",
      token: "APU",
      detail: "Arcade round",
    });
    expect(parsed.amenityKind).toBe("apu_credit");
    expect(parsed.token).toBe("APU");
    expect(parsed.priceUsd).toBeUndefined();
  });

  it("rejects mismatched amenityKind enum", () => {
    expect(
      PurchaseRecordSchema.safeParse({
        id: "rec-1",
        playerId: "p1",
        spaceId: "s1",
        amenityKind: "casino",
        itemRef: { kind: "shop", id: "x" },
        priceUsd: 1,
        at: "2026-05-12T00:00:00.000Z",
      }).success
    ).toBe(false);
  });
});

describe("space-content-model: isItemAvailableForPurchase", () => {
  it("returns true when sale.status is available", () => {
    const item = ShopItemSchema.parse({
      id: "i",
      spaceId: "s",
      type: "book",
      name: "n",
      description: "d",
      priceUsd: 1,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: { status: "available" },
    });
    expect(isItemAvailableForPurchase(item)).toBe(true);
  });

  it("returns false when sale.status is sold", () => {
    const item = ShopItemSchema.parse({
      id: "i",
      spaceId: "s",
      type: "book",
      name: "n",
      description: "d",
      priceUsd: 1,
      createdAt: "2026-05-12T00:00:00.000Z",
      sale: {
        status: "sold",
        soldToPlayerId: "p2",
        soldAt: "2026-05-12T00:00:00.000Z",
      },
    });
    expect(isItemAvailableForPurchase(item)).toBe(false);
  });
});

describe("space-content-model: desaturateColor", () => {
  it("returns black for a pure black input", () => {
    expect(desaturateColor(0x000000)).toBe(0x000000);
  });

  it("returns white for a pure white input", () => {
    expect(desaturateColor(0xffffff)).toBe(0xffffff);
  });

  it("collapses to the luminance grey using the standard coefficients", () => {
    const y = Math.round(0.299 * 255);
    expect(desaturateColor(0xff0000)).toBe((y << 16) | (y << 8) | y);
  });

  it("returns the same value for any RGB triple that already has equal channels", () => {
    expect(desaturateColor(0x808080)).toBe(0x808080);
  });

  it("clamps inputs outside the 24-bit range", () => {
    expect(desaturateColor(-1)).toBe(0x000000);
    expect(desaturateColor(0x1000000)).toBe(0xffffff);
  });
});
