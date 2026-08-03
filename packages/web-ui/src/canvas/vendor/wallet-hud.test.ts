// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createWalletHud } from "./wallet-hud.js";

const newParent = (): HTMLElement => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
};

describe("wallet-hud", () => {
  it("renders as an inline pill for placement in the bottom HUD dock", () => {
    const hud = createWalletHud({ parent: newParent() });
    const style = document.getElementById("preview-wallet-hud-styles");
    const hudBlock = style?.textContent?.match(
      /\.preview-wallet-hud \{[^}]*\}/,
    )?.[0];
    expect(hudBlock).toMatch(/position:\s*relative/);
    expect(hudBlock).not.toMatch(/position:\s*fixed/);
    expect(hudBlock).not.toMatch(/right:\s*12px/);
    hud.destroy();
  });

  it("renders a placeholder balance on mount", () => {
    const hud = createWalletHud({ parent: newParent() });
    expect(hud.root.textContent).toContain("$—");
  });

  it("setBalance formats APW with grouping and two decimals", () => {
    const hud = createWalletHud({ parent: newParent() });
    const amount = hud.root.querySelector(".agent-play-wallet-strip__amount");
    hud.setBalance(70);
    expect(amount?.textContent).toBe("$70.00");
    hud.setBalance(12.345);
    expect(amount?.textContent).toBe("$12.35");
    hud.setBalance(1234.5);
    expect(amount?.textContent).toBe("$1,234.50");
  });

  it("setPowerUps renders the diamond count with grouping", () => {
    const hud = createWalletHud({ parent: newParent() });
    hud.setBalance(10);
    hud.setPowerUps(7);
    expect(hud.root.textContent).toContain("$10.00");
    expect(hud.root.textContent).toContain("7");
    hud.setPowerUps(1234);
    expect(hud.root.textContent).toContain("1,234");
  });

  it("setPowerUpsLoading shows a placeholder count", () => {
    const hud = createWalletHud({ parent: newParent() });
    hud.setBalance(10);
    hud.setPowerUpsLoading();
    expect(hud.root.textContent).toContain("—");
  });

  it("setLoading and setError toggle the modifier classes", () => {
    const hud = createWalletHud({ parent: newParent() });
    hud.setLoading();
    expect(hud.root.className).toContain("--loading");
    hud.setError("rpc failed");
    expect(hud.root.className).toContain("--error");
    expect(hud.root.title).toBe("rpc failed");
  });

  it("destroy removes the HUD from its parent", () => {
    const parent = newParent();
    const hud = createWalletHud({ parent });
    expect(parent.children.length).toBe(1);
    hud.destroy();
    expect(parent.children.length).toBe(0);
  });

  it("is a button so it is clickable / keyboard-focusable", () => {
    const hud = createWalletHud({ parent: newParent() });
    expect(hud.root.tagName).toBe("BUTTON");
  });

  it("invokes onClick when the HUD is clicked", () => {
    const onClick = vi.fn();
    const hud = createWalletHud({ parent: newParent(), onClick });
    hud.root.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
