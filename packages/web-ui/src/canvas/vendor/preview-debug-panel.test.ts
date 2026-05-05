// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createPreviewDebugPanel } from "./preview-debug-panel.js";

describe("createPreviewDebugPanel", () => {
  it("renders snapshot agents and structures in the body", () => {
    const panel = createPreviewDebugPanel({
      getSnapshot: () => ({
        agents: [
          {
            playerId: "p1",
            name: "Alpha",
            worldX: 1.25,
            worldY: 2.5,
          },
        ],
        structures: [
          {
            id: "s1",
            kind: "tree",
            x: 3,
            y: 4,
            toolName: "t1",
            playerId: "p1",
          },
        ],
      }),
    });
    expect(panel.element.querySelector(".preview-debug-panel__body")?.textContent).toContain(
      "Alpha"
    );
    expect(panel.element.querySelector(".preview-debug-panel__body")?.textContent).toContain(
      "p1"
    );
    expect(panel.element.querySelector(".preview-debug-panel__body")?.textContent).toContain(
      "tree"
    );
  });

  it("exposes title as a control when messages companion is hidden and toggles expand", () => {
    const mount = document.createElement("div");
    mount.className = "preview-debug-mount preview-debug-mount--visible preview-debug-mount--messages-hidden";
    const panel = createPreviewDebugPanel({
      getSnapshot: () => ({ agents: [], structures: [] }),
    });
    mount.appendChild(panel.element);
    panel.syncCompanionLayout();
    const title = panel.element.querySelector(".preview-debug-panel__title");
    expect(title?.getAttribute("role")).toBe("button");
    expect(title?.getAttribute("aria-expanded")).toBe("false");
    title?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.element.classList.contains("preview-debug-panel--expanded")).toBe(true);
    expect(title?.getAttribute("aria-expanded")).toBe("true");
    title?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.element.classList.contains("preview-debug-panel--expanded")).toBe(false);
  });

  it("does not mark the title as a button when the messages companion is visible", () => {
    const mount = document.createElement("div");
    mount.className = "preview-debug-mount preview-debug-mount--visible";
    const panel = createPreviewDebugPanel({
      getSnapshot: () => ({ agents: [], structures: [] }),
    });
    mount.appendChild(panel.element);
    panel.syncCompanionLayout();
    const title = panel.element.querySelector(".preview-debug-panel__title");
    expect(title?.getAttribute("role")).toBeNull();
    expect(title?.getAttribute("aria-expanded")).toBeNull();
  });
});
