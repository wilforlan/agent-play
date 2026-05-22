// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createWalletHud } from "./wallet-hud.js";

const newParent = (): HTMLElement => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
};

describe("wallet-hud", () => {
  it("renders a placeholder balance on mount", () => {
    const hud = createWalletHud({ parent: newParent() });
    expect(hud.root.textContent).toContain("$—");
  });

  it("setBalance formats USD with two decimals", () => {
    const hud = createWalletHud({ parent: newParent() });
    hud.setBalance(70);
    expect(hud.root.textContent).toContain("$70.00");
    hud.setBalance(12.345);
    expect(hud.root.textContent).toContain("$12.35");
  });

  it("setPowerUps renders the diamond count", () => {
    const hud = createWalletHud({ parent: newParent() });
    hud.setBalance(10);
    hud.setPowerUps(7);
    expect(hud.root.textContent).toContain("$10.00");
    expect(hud.root.textContent).toContain("7");
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
