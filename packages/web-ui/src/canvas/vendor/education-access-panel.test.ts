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

  it("prompts Finance Hub and P2P when the wallet cannot afford day entry", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const panel = createEducationAccessPanel({ parent });
    panel.show({
      centerId: "faculty-science",
      centerLabel: "Faculty of Science",
      apuCost: 5,
      quoteApw: 0.33,
      preferredTender: "apu",
      balanceUsd: 0,
      powerUps: 0,
      canAfford: false,
      onPurchase: () => {},
      onDismiss: () => {},
    });
    expect(parent.textContent).toContain("0 APU");
    expect(parent.textContent).toContain("Finance Hub");
    expect(parent.textContent).toContain("Find a peer to trade");
    const finance = parent.querySelector(
      'a[href="https://econext.llc"]'
    ) as HTMLAnchorElement | null;
    const p2p = parent.querySelector(
      'a[href="https://p2p.econext.llc"]'
    ) as HTMLAnchorElement | null;
    expect(finance?.target).toBe("_blank");
    expect(p2p?.target).toBe("_blank");
    const unlock = Array.from(parent.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("Unlock")
    );
    expect(unlock?.disabled).toBe(true);
    panel.destroy();
    parent.remove();
  });
});
