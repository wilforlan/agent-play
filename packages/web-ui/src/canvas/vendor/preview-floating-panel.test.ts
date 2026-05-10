// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachPreviewFloatingPanelDrag,
  syncPreviewCanvasHostScale,
} from "./preview-floating-panel.js";

const rect = (input: {
  left: number;
  top: number;
  width: number;
  height: number;
}): DOMRect => {
  return {
    x: input.left,
    y: input.top,
    left: input.left,
    top: input.top,
    right: input.left + input.width,
    bottom: input.top + input.height,
    width: input.width,
    height: input.height,
    toJSON: () => ({}),
  };
};

const getButton = (root: HTMLElement, selector: string): HTMLButtonElement => {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${selector} to be a button`);
  }
  return element;
};

describe("attachPreviewFloatingPanelDrag", () => {
  let bounds: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    bounds = document.createElement("div");
    panel = document.createElement("section");
    bounds.appendChild(panel);
    document.body.appendChild(bounds);
    bounds.getBoundingClientRect = () =>
      rect({ left: 10, top: 20, width: 300, height: 220 });
    panel.getBoundingClientRect = () =>
      rect({
        left: Number.parseFloat(panel.style.left || "0") + 10,
        top: Number.parseFloat(panel.style.top || "0") + 20,
        width: 120,
        height: 80,
      });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds a drag handle and shows the panel body by default", () => {
    const content = document.createElement("p");
    content.textContent = "Panel content";
    panel.appendChild(content);

    attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "World messages",
      initialPlacement: { leftPx: 24, topPx: 32 },
      resolvePlacement: () => ({ leftPx: 24, topPx: 32 }),
    });

    const handle = getButton(panel, ".preview-floating-panel__drag");
    expect(panel.classList.contains("preview-floating-panel")).toBe(true);
    expect(handle.getAttribute("aria-label")).toBe("Move World messages panel");
    expect(handle.textContent).toContain("World messages");
    expect(panel.style.left).toBe("24px");
    expect(panel.style.top).toBe("32px");
    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      false
    );
    expect(handle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.querySelector(".preview-floating-panel__body")?.textContent).toBe(
      "Panel content"
    );
    expect(
      panel
        .querySelector(".preview-floating-panel__body")
        ?.getAttribute("aria-hidden")
    ).toBe("false");
  });

  it("moves the panel by dragging and clamps it inside the world layer", () => {
    attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "Debug",
      initialPlacement: { leftPx: 24, topPx: 32 },
      resolvePlacement: () => ({ leftPx: 24, topPx: 32 }),
    });
    const handle = getButton(panel, ".preview-floating-panel__drag");

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 40,
        clientY: 60,
        pointerId: 1,
      })
    );
    handle.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: 600,
        clientY: 500,
        pointerId: 1,
      })
    );

    expect(panel.style.left).toBe("180px");
    expect(panel.style.top).toBe("140px");
  });

  it("collapses and expands the panel body when the header is clicked", () => {
    const content = document.createElement("p");
    content.textContent = "Debug content";
    panel.appendChild(content);
    attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "Debug",
      initialPlacement: { leftPx: 24, topPx: 32 },
      resolvePlacement: () => ({ leftPx: 24, topPx: 32 }),
    });
    const handle = getButton(panel, ".preview-floating-panel__drag");

    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      false
    );
    expect(handle.getAttribute("aria-expanded")).toBe("true");
    handle.click();
    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      true
    );
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(
      panel
        .querySelector(".preview-floating-panel__body")
        ?.getAttribute("aria-hidden")
    ).toBe("true");
    handle.click();
    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      false
    );
    expect(handle.getAttribute("aria-expanded")).toBe("true");
  });

  it("treats pointer down and up without movement as a header collapse tap", () => {
    const content = document.createElement("p");
    content.textContent = "Messages";
    panel.appendChild(content);
    attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "World messages",
      initialPlacement: { leftPx: 24, topPx: 32 },
      resolvePlacement: () => ({ leftPx: 24, topPx: 32 }),
    });
    const handle = getButton(panel, ".preview-floating-panel__drag");

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 40,
        clientY: 60,
        pointerId: 1,
      })
    );
    handle.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: 40,
        clientY: 60,
        pointerId: 1,
      })
    );

    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      true
    );
    expect(handle.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses stationary placement from resolvePlacement and stays expanded until toggled", () => {
    const content = document.createElement("p");
    content.textContent = "Docked";
    panel.appendChild(content);
    attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "World messages",
      initialPlacement: { leftPx: 24, topPx: 32 },
      layoutMode: "stationary",
      resolvePlacement: (mode) =>
        mode === "stationary"
          ? { leftPx: 8, topPx: 12 }
          : { leftPx: 24, topPx: 32 },
    });

    expect(panel.style.left).toBe("8px");
    expect(panel.style.top).toBe("12px");
    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      false
    );
  });

  it("setLayoutMode switches placement via resolvePlacement without changing collapsed state", () => {
    const content = document.createElement("p");
    content.textContent = "Body";
    panel.appendChild(content);
    const { setLayoutMode } = attachPreviewFloatingPanelDrag({
      element: panel,
      getBoundsElement: () => bounds,
      label: "Debug",
      initialPlacement: { leftPx: 24, topPx: 32 },
      layoutMode: "stationary",
      resolvePlacement: (mode) =>
        mode === "stationary"
          ? { leftPx: 8, topPx: 12 }
          : { leftPx: 24, topPx: 32 },
    });
    expect(panel.style.left).toBe("8px");
    setLayoutMode("floating");
    expect(panel.style.left).toBe("24px");
    expect(panel.style.top).toBe("32px");
    expect(panel.classList.contains("preview-floating-panel--collapsed")).toBe(
      false
    );
  });
});

describe("syncPreviewCanvasHostScale", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("scales the fixed-size world host with breathing room inside the viewport stage", () => {
    const stage = document.createElement("div");
    const host = document.createElement("div");
    stage.appendChild(host);
    document.body.appendChild(stage);
    stage.getBoundingClientRect = () =>
      rect({ left: 0, top: 0, width: 1440, height: 1040 });

    syncPreviewCanvasHostScale({
      stage,
      host,
      viewWidth: 720,
      viewHeight: 520,
    });

    expect(host.style.transform).toBe("translate(-50%, -50%) scale(1.8)");
  });

  it("uses the smaller viewport ratio so the game world is not cut off", () => {
    const stage = document.createElement("div");
    const host = document.createElement("div");
    stage.appendChild(host);
    document.body.appendChild(stage);
    stage.getBoundingClientRect = () =>
      rect({ left: 0, top: 0, width: 1024, height: 700 });

    syncPreviewCanvasHostScale({
      stage,
      host,
      viewWidth: 720,
      viewHeight: 520,
    });

    expect(host.style.transform).toBe(
      "translate(-50%, -50%) scale(1.2115384615384617)"
    );
  });
});
