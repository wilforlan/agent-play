// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  buildPurchaseSubtitle,
  createWalletInventoryPanel,
} from "./wallet-inventory-panel.js";
import type { PurchaseRecordDto } from "./wallet-purchases-client.js";

const newParent = (): HTMLElement => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
};

const carPurchase = (overrides?: Partial<PurchaseRecordDto>): PurchaseRecordDto => ({
  id: "p1",
  playerId: "u",
  spaceId: "space-A",
  amenityKind: "car_wash",
  itemRef: { kind: "carwash", id: "car-1" },
  priceUsd: 100,
  at: "2026-01-01T12:00:00.000Z",
  ...overrides,
});

describe("buildPurchaseSubtitle", () => {
  it("uses model and year for car-wash items", () => {
    const subtitle = buildPurchaseSubtitle({
      record: carPurchase(),
      fields: { model: "GT", year: 2024 },
    });
    expect(subtitle).toContain("GT");
    expect(subtitle).toContain("2024");
    expect(subtitle).toContain("Bought");
  });

  it("falls back to Bought-date only when fields are missing", () => {
    const subtitle = buildPurchaseSubtitle({
      record: carPurchase(),
      fields: {},
    });
    expect(subtitle.startsWith("Bought ")).toBe(true);
  });

  it("uses the item type for shop items", () => {
    const subtitle = buildPurchaseSubtitle({
      record: carPurchase({
        amenityKind: "shop",
        itemRef: { kind: "shop", id: "x" },
      }),
      fields: { type: "book" },
    });
    expect(subtitle).toContain("book");
    expect(subtitle).toContain("Bought");
  });

  it("formats wallet bundle rows with APU spent when present", () => {
    const subtitle = buildPurchaseSubtitle({
      record: carPurchase({
        amenityKind: "wallet_bundle",
        spaceId: "__wallet__",
        itemRef: { kind: "bundle", id: "bundle-10" },
        priceUsd: 10,
        powerUpsSpent: 25,
        detail: "$10 balance",
      }),
      fields: {},
    });
    expect(subtitle).toContain("25 APU redeemed");
    expect(subtitle).toContain("$10 balance");
  });

  it("formats APU credit rows with credit source", () => {
    const subtitle = buildPurchaseSubtitle({
      record: carPurchase({
        amenityKind: "apu_credit",
        spaceId: "__arcade__",
        itemRef: { kind: "game", id: "hidden-gems" },
        creditSource: "game:hidden-gems",
        powerUpsEarned: 12,
        powerUpsDelta: 12,
        detail: "Arcade round round-1",
      }),
      fields: {},
    });
    expect(subtitle).toContain("game:hidden-gems");
    expect(subtitle).toContain("Arcade round round-1");
  });
});

describe("createWalletInventoryPanel", () => {
  it("is closed on mount", () => {
    const panel = createWalletInventoryPanel({
      parent: newParent(),
      onRefresh: () => {},
    });
    expect(panel.isOpen()).toBe(false);
    expect(panel.root.className).not.toContain("--open");
  });

  it("opens on open() and triggers onRefresh", () => {
    const onRefresh = vi.fn();
    const panel = createWalletInventoryPanel({
      parent: newParent(),
      onRefresh,
    });
    panel.open();
    expect(panel.isOpen()).toBe(true);
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(panel.root.className).toContain("--open");
  });

  it("setData while open renders the purchases list", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setData({
      balanceUsd: 42,
      powerUps: 3,
      purchases: [carPurchase()],
      items: {
        "carwash:space-A:car-1": {
          name: "GTR",
          model: "GT",
          year: 2024,
          colorHex: "#ff0000",
        },
      },
    });
    expect(parent.textContent).toContain("$42.00");
    expect(parent.textContent).toContain("3");
    expect(parent.textContent).toContain("GTR");
    expect(parent.textContent).toContain("$100.00");
  });

  it("clicking Open shows the detail view with Back/Close buttons", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setData({
      balanceUsd: 0,
      powerUps: 0,
      purchases: [carPurchase()],
      items: {
        "carwash:space-A:car-1": {
          name: "GTR",
          model: "GT",
          year: 2024,
        },
      },
    });
    const openBtn = parent.querySelector<HTMLButtonElement>(
      ".preview-wallet-inventory__open"
    );
    expect(openBtn).not.toBeNull();
    openBtn?.click();
    expect(parent.textContent).toContain("← Back to inventory");
    expect(parent.textContent).toContain("Model");
    expect(parent.textContent).toContain("GT");
    expect(parent.textContent).toContain("2024");
  });

  it("Back returns to the list", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setData({
      balanceUsd: 0,
      powerUps: 0,
      purchases: [carPurchase()],
      items: {},
    });
    parent
      .querySelector<HTMLButtonElement>(".preview-wallet-inventory__open")
      ?.click();
    expect(parent.textContent).toContain("← Back to inventory");
    parent
      .querySelector<HTMLButtonElement>(".preview-wallet-inventory__back")
      ?.click();
    expect(parent.textContent).not.toContain("← Back to inventory");
  });

  it("setLoading shows a loading message while open", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setLoading();
    expect(parent.textContent).toContain("Loading your inventory");
  });

  it("setError shows the error message", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setError("boom");
    expect(parent.textContent).toContain("boom");
  });

  it("shows the bundle exchange strip when onRedeemBundle is provided", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
      onRedeemBundle: async () => {},
    });
    panel.open();
    panel.setData({ balanceUsd: 10, powerUps: 500, purchases: [], items: {} });
    expect(parent.textContent).toContain("Exchange power-ups");
    expect(parent.textContent).toContain("Redeem");
  });

  it("renders purchases with an unknown amenity kind without throwing", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    const legacy = {
      id: "legacy-1",
      playerId: "u",
      spaceId: "space-A",
      amenityKind: "legacy_kind",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 2.5,
      at: "2026-02-01T10:00:00.000Z",
    } as PurchaseRecordDto;
    panel.setData({
      balanceUsd: 10,
      powerUps: 0,
      purchases: [legacy],
      items: {},
    });
    expect(parent.textContent).toContain("$2.50");
    expect(parent.textContent).toContain("Activity");
  });

  it("renders an empty-state when there are no purchases", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setData({ balanceUsd: 10, powerUps: 0, purchases: [], items: {} });
    expect(parent.textContent).toContain("No wallet activity yet");
  });
});
