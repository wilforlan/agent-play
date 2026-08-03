// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createBottomHudDock } from "./bottom-hud-dock.js";
import { createGameStreakPanel } from "./game-streak-panel.js";
import { createWalletHud } from "./wallet-hud.js";

const newParent = (): HTMLElement => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
};

describe("bottom hud dock", () => {
  it("anchors a flex row with gap at the bottom-left on mobile and top-right on desktop", () => {
    const dock = createBottomHudDock({ parent: newParent() });
    const style = document.getElementById("preview-bottom-hud-dock-styles");
    const css = style?.textContent ?? "";
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?display:\s*flex/,
    );
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?gap:\s*8px/,
    );
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?bottom:\s*max\(12px,\s*calc\(12px \+ env\(safe-area-inset-bottom/,
    );
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?left:\s*12px/,
    );
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?justify-content:\s*flex-start/,
    );
    expect(css).toMatch(
      /\.preview-bottom-hud-dock \{[\s\S]*?flex-wrap:\s*wrap/,
    );
    expect(css).toMatch(
      /@media \(min-width:\s*1024px\) \{[\s\S]*?\.preview-bottom-hud-dock \{[\s\S]*?top:\s*max\(12px,\s*calc\(12px \+ env\(safe-area-inset-top/,
    );
    expect(css).toMatch(
      /@media \(min-width:\s*1024px\) \{[\s\S]*?\.preview-bottom-hud-dock \{[\s\S]*?right:\s*12px/,
    );
    expect(css).toMatch(
      /@media \(min-width:\s*1024px\) \{[\s\S]*?\.preview-bottom-hud-dock \{[\s\S]*?left:\s*auto/,
    );
    expect(css).toMatch(
      /@media \(min-width:\s*1024px\) \{[\s\S]*?\.preview-bottom-hud-dock \{[\s\S]*?bottom:\s*auto/,
    );
    dock.destroy();
  });

  it("keeps the games pill and wallet balance as siblings with no fixed right offset collision", () => {
    const parent = newParent();
    const dock = createBottomHudDock({ parent });
    const hud = createWalletHud({ parent: dock.root });
    const panel = createGameStreakPanel({
      parent,
      pillParent: dock.root,
      onRefresh: () => {},
    });

    expect(dock.root.contains(panel.pill)).toBe(true);
    expect(dock.root.contains(hud.root)).toBe(true);
    expect(panel.pill.parentElement).toBe(dock.root);
    expect(hud.root.parentElement).toBe(dock.root);

    const gameStyles = document.getElementById("preview-game-streak-styles");
    const walletStyles = document.getElementById("preview-wallet-hud-styles");
    expect(gameStyles?.textContent).not.toMatch(
      /\.preview-game-streak-pill \{[\s\S]*?right:\s*148px/,
    );
    expect(walletStyles?.textContent).not.toMatch(
      /\.preview-wallet-hud \{[\s\S]*?right:\s*12px/,
    );

    const children = Array.from(dock.root.children);
    expect(children.indexOf(panel.pill)).toBeLessThan(children.indexOf(hud.root));

    panel.destroy();
    hud.destroy();
    dock.destroy();
  });
});
