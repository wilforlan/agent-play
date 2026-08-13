// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createPeerCallHud } from "./peer-call-hud.js";

describe("createPeerCallHud", () => {
  it("shows peer name and HH:MM:SS elapsed time", () => {
    document.body.innerHTML = "";
    const hud = createPeerCallHud({ parent: document.body });
    hud.setPeerName("Alice");
    hud.setElapsedSeconds(3661);
    hud.setVisible(true);
    expect(hud.root.classList.contains("preview-peer-call-hud--visible")).toBe(
      true
    );
    expect(hud.root.textContent).toContain("Alice");
    expect(hud.root.textContent).toContain("01:01:01");
    hud.destroy();
  });
});
