// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  canAffordEducationDayPass,
  createEducationAccessPanel,
} from "./education-access-panel.js";

describe("education-access-panel", () => {
  it("detects affordability by either tender", () => {
    expect(
      canAffordEducationDayPass({
        powerUps: 5,
        balanceUsd: 0,
        apuCost: 5,
        quoteApw: 0.33,
      })
    ).toBe(true);
    expect(
      canAffordEducationDayPass({
        powerUps: 0,
        balanceUsd: 0.5,
        apuCost: 5,
        quoteApw: 0.33,
      })
    ).toBe(true);
    expect(
      canAffordEducationDayPass({
        powerUps: 2,
        balanceUsd: 0.1,
        apuCost: 5,
        quoteApw: 0.33,
      })
    ).toBe(false);
  });

  it("shows center cost and purchases day entry", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const onPurchase = vi.fn();
    const onDismiss = vi.fn();
    const panel = createEducationAccessPanel({ parent });
    panel.show({
      centerId: "foundations-hall",
      centerLabel: "Foundations",
      apuCost: 5,
      quoteApw: 0.33,
      preferredTender: "apw",
      balanceUsd: 10,
      powerUps: 0,
      canAfford: true,
      onPurchase,
      onDismiss,
    });
    expect(panel.isOpen()).toBe(true);
    expect(parent.textContent).toContain("Elm Street");
    expect(parent.textContent).toContain("Foundations");
    expect(parent.textContent).toContain("5 APU");
    expect(parent.textContent).toContain("Paying with APW$");

    const unlock = Array.from(parent.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("Unlock Foundations")
    );
    expect(unlock).toBeDefined();
    unlock?.click();
    expect(onPurchase).toHaveBeenCalledTimes(1);
    panel.destroy();
    parent.remove();
  });
});
