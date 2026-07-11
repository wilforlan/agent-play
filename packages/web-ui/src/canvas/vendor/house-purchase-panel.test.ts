// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHousePurchasePanel } from "./house-purchase-panel.js";

describe("house-purchase-panel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows owner name and signature fields for vacant houses", () => {
    const panel = createHousePurchasePanel();
    panel.show({
      houseId: 1,
      layoutLabel: "Studio layout",
      priceUsd: 1299.99,
      ownerDisplayName: null,
      balanceUsd: 5000,
      onBuy: () => {},
    });
    const nameInput = panel.root.querySelector<HTMLInputElement>(
      'input[data-field="owner-name"]'
    );
    const signatureInput = panel.root.querySelector<HTMLInputElement>(
      'input[data-field="owner-signature"]'
    );
    expect(nameInput).not.toBeNull();
    expect(signatureInput).not.toBeNull();
    panel.destroy();
  });

  it("requires name and signature before buying", () => {
    const panel = createHousePurchasePanel();
    const onBuy = vi.fn();
    panel.show({
      houseId: 2,
      layoutLabel: "Split room",
      priceUsd: 2199.99,
      ownerDisplayName: null,
      balanceUsd: 5000,
      onBuy,
    });
    const buyBtn = panel.root.querySelector("button");
    buyBtn?.click();
    expect(onBuy).not.toHaveBeenCalled();
    expect(panel.root.textContent).toContain("Enter your name and initials");
    panel.destroy();
  });

  it("passes trimmed owner details to onBuy", () => {
    const panel = createHousePurchasePanel();
    const onBuy = vi.fn();
    panel.show({
      houseId: 3,
      layoutLabel: "L-shaped",
      priceUsd: 3499.99,
      ownerDisplayName: null,
      balanceUsd: 5000,
      onBuy,
    });
    const nameInput = panel.root.querySelector<HTMLInputElement>(
      'input[data-field="owner-name"]'
    );
    const signatureInput = panel.root.querySelector<HTMLInputElement>(
      'input[data-field="owner-signature"]'
    );
    if (nameInput === null || signatureInput === null) {
      throw new Error("inputs missing");
    }
    nameInput.value = "  Alex Kim  ";
    signatureInput.value = " ak ";
    const buyBtn = panel.root.querySelector("button");
    buyBtn?.click();
    expect(onBuy).toHaveBeenCalledWith({
      ownerName: "Alex Kim",
      ownerSignature: "ak",
    });
    panel.destroy();
  });
});
