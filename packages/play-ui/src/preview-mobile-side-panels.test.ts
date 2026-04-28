// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachMobileSidePanelControls } from "./preview-mobile-side-panels.js";

type MatchMediaMock = {
  matches: boolean;
  addEventListener: (type: string, listener: () => void) => void;
};

describe("attachMobileSidePanelControls", () => {
  let shell: HTMLElement;
  let toggleLeft: HTMLButtonElement;
  let toggleRight: HTMLButtonElement;
  let backdrop: HTMLButtonElement;
  let mm: MatchMediaMock;

  beforeEach(() => {
    shell = document.createElement("div");
    toggleLeft = document.createElement("button");
    toggleRight = document.createElement("button");
    backdrop = document.createElement("button");
    mm = {
      matches: false,
      addEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mm));
  });

  it("opens right panel programmatically on mobile", () => {
    const controls = attachMobileSidePanelControls({
      shell,
      toggleLeft,
      toggleRight,
      backdrop,
    });
    controls.openRightPanel();
    expect(shell.classList.contains("preview-side-right-open")).toBe(true);
    expect(toggleRight.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens left panel when left toggle is clicked", () => {
    attachMobileSidePanelControls({
      shell,
      toggleLeft,
      toggleRight,
      backdrop,
    });
    toggleLeft.click();
    expect(shell.classList.contains("preview-side-left-open")).toBe(true);
    expect(toggleLeft.getAttribute("aria-expanded")).toBe("true");
    expect(toggleRight.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not force open panel on wide screens", () => {
    mm.matches = true;
    const controls = attachMobileSidePanelControls({
      shell,
      toggleLeft,
      toggleRight,
      backdrop,
    });
    controls.openRightPanel();
    expect(shell.classList.contains("preview-side-right-open")).toBe(false);
  });
});
