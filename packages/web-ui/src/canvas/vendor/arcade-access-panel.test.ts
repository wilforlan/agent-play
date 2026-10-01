// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  canAffordArcadePlan,
  createArcadeAccessPanel,
} from "./arcade-access-panel.js";

describe("arcade-access-panel", () => {
  it("detects affordability by either tender", () => {
    expect(
      canAffordArcadePlan({
        plan: "day",
        powerUps: 25,
        balanceUsd: 0,
        dayApuCost: 25,
        weekApuCost: 140,
        quotes: { day: 1.66, week: 9.3 },
      })
    ).toBe(true);
    expect(
      canAffordArcadePlan({
        plan: "day",
        powerUps: 0,
        balanceUsd: 2,
        dayApuCost: 25,
        weekApuCost: 140,
        quotes: { day: 1.66, week: 9.3 },
      })
    ).toBe(true);
    expect(
      canAffordArcadePlan({
        plan: "week",
        powerUps: 10,
        balanceUsd: 1,
        dayApuCost: 25,
        weekApuCost: 140,
        quotes: { day: 1.66, week: 9.3 },
      })
    ).toBe(false);
  });

  it("shows day and weekly plans and purchases the selected plan", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const onPurchase = vi.fn();
    const onDismiss = vi.fn();
    const panel = createArcadeAccessPanel({ parent });
    panel.show({
      quotes: { day: 1.66, week: 9.3 },
      dayApuCost: 25,
      weekApuCost: 140,
      preferredTender: "apw",
      balanceUsd: 10,
      powerUps: 0,
      canAffordDay: true,
      canAffordWeek: true,
      onPurchase,
      onDismiss,
    });
    expect(panel.isOpen()).toBe(true);
    expect(parent.textContent).toContain("Maple Ave");
    expect(parent.textContent).toContain("Save 20%");
    expect(parent.textContent).toContain("Paying with APW$");

    const dayPlan = parent.querySelector(
      '[data-plan="day"]'
    ) as HTMLButtonElement;
    dayPlan.click();
    const unlock = Array.from(parent.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("Unlock 24h")
    );
    expect(unlock).toBeDefined();
    unlock?.click();
    expect(onPurchase).toHaveBeenCalledWith("day");
    panel.destroy();
    parent.remove();
  });
});
