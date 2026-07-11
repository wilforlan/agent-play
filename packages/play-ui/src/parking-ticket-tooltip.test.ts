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
});
