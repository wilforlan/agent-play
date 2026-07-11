// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createParkingTicketTooltip } from "./parking-ticket-tooltip.js";

describe("parking-ticket-tooltip", () => {
  it("shows tier prices and dispatches buy with nick, car, and tier", () => {
    const tooltip = createParkingTicketTooltip();
    const onBuy = vi.fn();
    tooltip.show({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      onBuy,
    });
    expect(tooltip.isOpen()).toBe(true);
    const nick = tooltip.root.querySelector("input");
    nick?.dispatchEvent(new Event("input", { bubbles: true }));
    if (nick instanceof HTMLInputElement) {
      nick.value = "Red Coupe";
    }
    tooltip.root.querySelector("button")?.click();
    expect(onBuy).toHaveBeenCalledWith({
      carPurchaseId: "car-1",
      durationTier: "1h",
      displayNick: "Red Coupe",
    });
    tooltip.destroy();
  });

  it("disables buy when ownership is blocked", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.show({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      ownershipBlocked: "Maximum timed parking spots reached (2 of 2).",
      onBuy: vi.fn(),
    });
    const btn = tooltip.root.querySelector("button");
    expect(btn?.hasAttribute("disabled")).toBe(true);
    expect(tooltip.root.textContent).toContain("2 of 2");
    tooltip.destroy();
  });

  it("disables buy when no cars are available", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.show({ cars: [], onBuy: vi.fn() });
    const btn = tooltip.root.querySelector("button");
    expect(btn?.hasAttribute("disabled")).toBe(true);
    tooltip.destroy();
  });

  it("setError restores the buy button", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.show({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      onBuy: vi.fn(),
    });
    tooltip.setBusy();
    tooltip.setError("Insufficient funds");
    expect(tooltip.root.textContent).toContain("Insufficient funds");
    expect(tooltip.isBusy()).toBe(false);
    tooltip.destroy();
  });

  it("showInspect renders occupant details and hides the buy form", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.showInspect({
      bay: 2,
      layer: 1,
      displayNick: "Red Coupe",
      model: "GT 350",
      colorHex: "#cc2233",
      tier: "1d",
      purchasedAt: "2026-07-10T14:30:00.000Z",
      expiresAt: "2026-07-11T14:30:00.000Z",
      costUsd: 5,
    });
    expect(tooltip.isOpen()).toBe(true);
    expect(tooltip.isInspectMode()).toBe(true);
    expect(tooltip.root.textContent).toContain("Bay 2");
    expect(tooltip.root.textContent).toContain("Red Coupe");
    expect(tooltip.root.textContent).toContain("GT 350");
    expect(tooltip.root.textContent).toContain("$5.00");
    expect(tooltip.root.textContent).toContain("1d");
    const buySection = tooltip.root.querySelector(
      ".preview-parking-ticket-tooltip__buy"
    );
    expect(
      buySection?.classList.contains("preview-parking-ticket-tooltip__buy--hidden")
    ).toBe(true);
    tooltip.destroy();
  });

  it("showInspect for forever tickets notes the spot is not available for purchase", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.showInspect({
      bay: 1,
      layer: 2,
      displayNick: "Forever Park",
      model: "Sedan",
      colorHex: "#112233",
      tier: "forever",
      purchasedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
      costUsd: 750,
    });
    expect(tooltip.root.textContent).toContain("Forever");
    expect(tooltip.root.textContent).toContain("not available for purchase");
    tooltip.destroy();
  });

  it("showLoading opens immediately with spinner before purchase data", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.showLoading();
    expect(tooltip.isOpen()).toBe(true);
    expect(tooltip.root.textContent).toContain("Loading cars");
    const buySection = tooltip.root.querySelector(
      ".preview-parking-ticket-tooltip__buy"
    );
    expect(
      buySection?.classList.contains("preview-parking-ticket-tooltip__buy--hidden")
    ).toBe(true);
    tooltip.destroy();
  });

  it("show replaces loading state with the buy form", () => {
    const tooltip = createParkingTicketTooltip();
    tooltip.showLoading();
    tooltip.show({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      onBuy: vi.fn(),
    });
    const loading = tooltip.root.querySelector(
      ".preview-parking-ticket-tooltip__loading"
    );
    expect(
      loading?.classList.contains("preview-parking-ticket-tooltip__loading--open")
    ).toBe(false);
    expect(tooltip.isInspectMode()).toBe(false);
    tooltip.destroy();
  });
});
