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
});
