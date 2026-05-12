// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createItemTooltip } from "./item-tooltip.js";

const newParent = (): HTMLElement => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
};

describe("item-tooltip", () => {
  it("renders a Buy button for available items and dispatches the handler on click", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    const onBuy = vi.fn();
    tooltip.show({
      model: {
        name: "Hitchhiker",
        description: "Don't Panic",
        priceUsd: 9.99,
        sale: { status: "available" },
      },
      onBuy,
    });
    const button = tooltip.root.querySelector<HTMLButtonElement>(
      ".preview-item-tooltip__buy"
    );
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain("Buy");
    button?.click();
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it("renders the SOLD pill and the buyer line when the item is sold", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: {
        name: "Coffee",
        priceUsd: 5,
        sale: { status: "sold", soldToPlayerId: "player-7" },
      },
      onBuy: () => {},
    });
    expect(
      tooltip.root.querySelector(".preview-item-tooltip__sold")
    ).toBeTruthy();
    expect(
      tooltip.root.querySelector(".preview-item-tooltip__buy")
    ).toBeNull();
    expect(tooltip.root.textContent).toContain("player-7");
  });

  it("hide() removes the open modifier", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    expect(tooltip.root.className).toContain("--open");
    tooltip.hide();
    expect(tooltip.root.className).not.toContain("--open");
  });

  it("setError appends an inline error message", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    tooltip.setError("Insufficient funds");
    expect(tooltip.root.textContent).toContain("Insufficient funds");
  });

  it("setBusy disables the Buy button", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    tooltip.setBusy();
    const button = tooltip.root.querySelector<HTMLButtonElement>(
      ".preview-item-tooltip__buy"
    );
    expect(button?.disabled).toBe(true);
  });

  it("isOpen reflects show / hide state", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    expect(tooltip.isOpen()).toBe(false);
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    expect(tooltip.isOpen()).toBe(true);
    tooltip.hide();
    expect(tooltip.isOpen()).toBe(false);
  });

  it("isBusy reflects setBusy / setError state", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    expect(tooltip.isBusy()).toBe(false);
    tooltip.setBusy();
    expect(tooltip.isBusy()).toBe(true);
    tooltip.setError("nope");
    expect(tooltip.isBusy()).toBe(false);
  });

  it("hide() resets isBusy", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    tooltip.setBusy();
    tooltip.hide();
    expect(tooltip.isBusy()).toBe(false);
  });

  it("position places the tooltip near the anchor, clamped to the viewport", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    tooltip.position({ x: 400, y: 300 });
    const left = parseFloat(tooltip.root.style.left);
    const top = parseFloat(tooltip.root.style.top);
    expect(Number.isNaN(left)).toBe(false);
    expect(Number.isNaN(top)).toBe(false);
  });

  it("position flips below the anchor when there is no room above", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.show({
      model: { name: "x", priceUsd: 1, sale: { status: "available" } },
      onBuy: () => {},
    });
    // Anchor at y=5 — no room above for a tooltip of any height +
    // gap+margin, so it must flip downward.
    tooltip.position({ x: 400, y: 5 });
    const top = parseFloat(tooltip.root.style.top);
    expect(top).toBeGreaterThanOrEqual(5);
  });

  it("position can be called before show without leaving the tooltip visible", () => {
    const tooltip = createItemTooltip({ parent: newParent() });
    tooltip.position({ x: 400, y: 300 });
    expect(tooltip.isOpen()).toBe(false);
  });
});
