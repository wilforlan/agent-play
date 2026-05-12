// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreviewProximityTouchControls,
  type CreatePreviewProximityTouchControlsOptions,
} from "./preview-proximity-touch-controls.js";

describe("createPreviewProximityTouchControls", () => {
  let parent: HTMLElement;
  let onAssist: ReturnType<typeof vi.fn>;
  let onChat: ReturnType<typeof vi.fn>;
  let onPushToTalk: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parent = document.createElement("div");
    parent.style.position = "relative";
    parent.style.width = "400px";
    parent.style.height = "300px";
    document.body.appendChild(parent);
    onAssist = vi.fn();
    onChat = vi.fn();
    onPushToTalk = vi.fn();
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
      onPushToTalk,
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
      onPushToTalk,
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
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const chatBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--chat"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    expect(chatBtn.disabled).toBe(true);
    expect(pttBtn.disabled).toBe(true);
    assistBtn.click();
    chatBtn.click();
    pttBtn.click();
    expect(onAssist).not.toHaveBeenCalled();
    expect(onChat).not.toHaveBeenCalled();
    expect(onPushToTalk).not.toHaveBeenCalled();
  });

  it("keeps the pad visible regardless of viewport", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      onAssist,
      onChat,
      onPushToTalk,
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
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    canAct = true;
    refresh();
    expect(assistBtn.disabled).toBe(false);
  });

  it("invokes onPushToTalk when P is tapped and can act", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
    expect(onAssist).not.toHaveBeenCalled();
    expect(onChat).not.toHaveBeenCalled();
  });

  it("relabels A to 'Enter' and enables it when getStructureProximity returns a label", () => {
    let label: string | null = null;
    const { root, refresh } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getStructureProximityLabel: () => label,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const chatBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--chat"
    ) as HTMLButtonElement;
    const subA = root.querySelector(
      ".preview-proximity-touch-pad__key--assist .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(assistBtn.disabled).toBe(true);
    expect(subA.textContent).toBe("Assist");
    label = "SandMill Circle";
    refresh();
    expect(assistBtn.disabled).toBe(false);
    expect(subA.textContent).toBe("Enter");
    expect(chatBtn.disabled).toBe(true);
    assistBtn.click();
    expect(onAssist).toHaveBeenCalledTimes(1);
  });

  it("relabels P to 'Enter <amenity>' and enables P when getAmenityProximityLabel returns a label", () => {
    let label: string | null = null;
    const opts: CreatePreviewProximityTouchControlsOptions = {
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getAmenityProximityLabel: () => label,
      onAssist,
      onChat,
      onPushToTalk,
    };
    const { root, refresh } = createPreviewProximityTouchControls(opts);
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const chatBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--chat"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(pttBtn.disabled).toBe(true);
    expect(subP.textContent).toBe("Push");
    label = "Shop";
    refresh();
    expect(pttBtn.disabled).toBe(false);
    expect(subP.textContent).toBe("Enter");
    expect(assistBtn.disabled).toBe(true);
    expect(chatBtn.disabled).toBe(true);
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("prefers amenity proximity over structure proximity (yard-only state wins)", () => {
    const opts: CreatePreviewProximityTouchControlsOptions = {
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getStructureProximityLabel: () => "SandMill Circle",
      getAmenityProximityLabel: () => "Shop",
      onAssist,
      onChat,
      onPushToTalk,
    };
    const { root } = createPreviewProximityTouchControls(opts);
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    expect(pttBtn.disabled).toBe(false);
  });
});
