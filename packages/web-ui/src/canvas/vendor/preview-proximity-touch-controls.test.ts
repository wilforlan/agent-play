// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPreviewProximityTouchControls } from "./preview-proximity-touch-controls.js";

describe("createPreviewProximityTouchControls", () => {
  let parent: HTMLElement;
  let onAssist: ReturnType<typeof vi.fn>;
  let onChat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parent = document.createElement("div");
    parent.style.position = "relative";
    parent.style.width = "400px";
    parent.style.height = "300px";
    document.body.appendChild(parent);
    onAssist = vi.fn();
    onChat = vi.fn();
  });

  afterEach(() => {
    parent.remove();
  });

  it("invokes onAssist when A is tapped and can act", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      onAssist,
      onChat,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    assistBtn.click();
    expect(onAssist).toHaveBeenCalledTimes(1);
    expect(onChat).not.toHaveBeenCalled();
  });

  it("invokes onChat when C is tapped and can act", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      onAssist,
      onChat,
    });
    const chatBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--chat"
    ) as HTMLButtonElement;
    chatBtn.click();
    expect(onChat).toHaveBeenCalledTimes(1);
    expect(onAssist).not.toHaveBeenCalled();
  });

  it("does not invoke callbacks when cannot act", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      onAssist,
      onChat,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const chatBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--chat"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    expect(chatBtn.disabled).toBe(true);
    assistBtn.click();
    chatBtn.click();
    expect(onAssist).not.toHaveBeenCalled();
    expect(onChat).not.toHaveBeenCalled();
  });

  it("keeps the pad visible regardless of viewport", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      onAssist,
      onChat,
    });
    expect(root.classList.contains("preview-proximity-touch-pad--hidden")).toBe(
      false
    );
  });

  it("refresh updates disabled state when can act changes", () => {
    let canAct = false;
    const { root, refresh } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => canAct,
      onAssist,
      onChat,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    canAct = true;
    refresh();
    expect(assistBtn.disabled).toBe(false);
  });
});
