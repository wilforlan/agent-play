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

  it("renders an empty-state when there are no purchases", () => {
    const parent = newParent();
    const panel = createWalletInventoryPanel({
      parent,
      onRefresh: () => {},
    });
    panel.open();
    panel.setData({ balanceUsd: 70, purchases: [], items: {} });
    expect(parent.textContent).toContain("haven't bought anything");
  });
});
