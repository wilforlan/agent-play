// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  canAffordEducationTuition,
  createEducationTuitionPanel,
} from "./education-tuition-panel.js";

describe("education-tuition-panel", () => {
  it("detects tuition affordability by either tender", () => {
    expect(
      canAffordEducationTuition({
        powerUps: 450,
        balanceUsd: 0,
        apuCost: 450,
        quoteApw: 450,
      })
    ).toBe(true);
    expect(
      canAffordEducationTuition({
        powerUps: 0,
        balanceUsd: 450,
        apuCost: 450,
        quoteApw: 450,
      })
    ).toBe(true);
    expect(
      canAffordEducationTuition({
        powerUps: 10,
        balanceUsd: 1,
        apuCost: 450,
        quoteApw: 450,
      })
    ).toBe(false);
  });

  it("prompts Finance Hub and P2P when school fees cannot be paid", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const panel = createEducationTuitionPanel({ parent });
    panel.show({
      facultyLabel: "Faculty of Art",
      pathTitle: "Visual Studio",
      quoteApw: 900,
      apuCost: 900,
      preferredTender: "apu",
      balanceUsd: 0,
      powerUps: 0,
      canAfford: false,
      onPurchase: () => {},
      onDismiss: () => {},
    });
    expect(panel.isOpen()).toBe(true);
    expect(parent.textContent).toContain("0 APU");
    expect(parent.textContent).toContain("Finance Hub");
    expect(parent.textContent).toContain("Find a peer to trade");
    expect(
      parent.querySelector('a[href="https://econext.llc"]')
    ).not.toBeNull();
    expect(
      parent.querySelector('a[href="https://p2p.econext.llc"]')
    ).not.toBeNull();
    panel.destroy();
    parent.remove();
  });

  it("hides the Finance Hub CTA when the learner can afford fees", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const panel = createEducationTuitionPanel({ parent });
    panel.show({
      facultyLabel: "Faculty of Science",
      pathTitle: "Computer Modeling",
      quoteApw: 450,
      apuCost: 450,
      preferredTender: "apw",
      balanceUsd: 500,
      powerUps: 0,
      canAfford: true,
      onPurchase: () => {},
      onDismiss: () => {},
    });
    const financeHub = parent.querySelector(
      ".preview-education-tuition__finance-hub"
    ) as HTMLElement | null;
    expect(financeHub?.hidden).toBe(true);
    panel.destroy();
    parent.remove();
  });
});
