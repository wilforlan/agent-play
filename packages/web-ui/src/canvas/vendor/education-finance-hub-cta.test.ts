/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  EDUCATION_FINANCE_HUB_URL,
  EDUCATION_P2P_URL,
  educationFinanceHubPromptCopy,
  mountEducationFinanceHubCta,
  shouldShowEducationFinanceHubCta,
} from "./education-finance-hub-cta.js";

describe("education finance hub CTA", () => {
  it("shows when the learner cannot afford the purchase", () => {
    expect(shouldShowEducationFinanceHubCta({ canAfford: false })).toBe(true);
    expect(shouldShowEducationFinanceHubCta({ canAfford: true })).toBe(false);
  });

  it("shows when a purchase error reports insufficient funds", () => {
    expect(
      shouldShowEducationFinanceHubCta({
        canAfford: true,
        errorMessage: "Insufficient funds",
      })
    ).toBe(true);
  });

  it("uses zero-APU copy when the wallet has no APU", () => {
    expect(educationFinanceHubPromptCopy({ powerUps: 0 })).toContain("0 APU");
    expect(educationFinanceHubPromptCopy({ powerUps: 0 })).toContain(
      "Finance Hub"
    );
    expect(educationFinanceHubPromptCopy({ powerUps: 0 })).toContain("P2P");
  });

  it("uses underfunded copy when APU is positive but still short", () => {
    expect(educationFinanceHubPromptCopy({ powerUps: 3 })).toContain(
      "Not enough balance"
    );
  });

  it("mounts Finance Hub and P2P links when visible", () => {
    const container = document.createElement("div");
    mountEducationFinanceHubCta({
      container,
      powerUps: 0,
      visible: true,
    });
    expect(container.hidden).toBe(false);
    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe(EDUCATION_FINANCE_HUB_URL);
    expect(links[0]?.textContent).toBe("Finance Hub");
    expect(links[0]?.target).toBe("_blank");
    expect(links[1]?.getAttribute("href")).toBe(EDUCATION_P2P_URL);
    expect(links[1]?.textContent).toBe("Find a peer to trade");
    expect(container.textContent).toContain("0 APU");
  });

  it("hides and clears the CTA when the learner can afford", () => {
    const container = document.createElement("div");
    mountEducationFinanceHubCta({
      container,
      powerUps: 0,
      visible: true,
    });
    mountEducationFinanceHubCta({
      container,
      powerUps: 10,
      visible: false,
    });
    expect(container.hidden).toBe(true);
    expect(container.children).toHaveLength(0);
  });
});
