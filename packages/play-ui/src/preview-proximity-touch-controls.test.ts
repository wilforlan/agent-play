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
  let onWallet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parent = document.createElement("div");
    parent.style.position = "relative";
    parent.style.width = "400px";
    parent.style.height = "300px";
    document.body.appendChild(parent);
    onAssist = vi.fn();
    onChat = vi.fn();
    onPushToTalk = vi.fn();
    onWallet = vi.fn();
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

  it("relabels P to the amenity-item action label and clicks invoke onPushToTalk", () => {
    let label: string | null = null;
    const opts: CreatePreviewProximityTouchControlsOptions = {
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getAmenityItemActionLabel: () => label,
      onAssist,
      onChat,
      onPushToTalk,
    };
    const { root, refresh } = createPreviewProximityTouchControls(opts);
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(pttBtn.disabled).toBe(true);
    expect(subP.textContent).toBe("Push");
    label = "Buy";
    refresh();
    expect(pttBtn.disabled).toBe(false);
    expect(subP.textContent).toBe("Buy");
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("amenity-item action label takes precedence over amenity / structure proximity labels", () => {
    const opts: CreatePreviewProximityTouchControlsOptions = {
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getStructureProximityLabel: () => "SandMill Circle",
      getAmenityProximityLabel: () => "Shop",
      getAmenityItemActionLabel: () => "Buy",
      onAssist,
      onChat,
      onPushToTalk,
    };
    const { root } = createPreviewProximityTouchControls(opts);
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(subP.textContent).toBe("Buy");
  });

  it("renders a W (wallet) button and invokes onWallet when tapped, even with no proximity", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      onAssist,
      onChat,
      onPushToTalk,
      onWallet,
    });
    const walletBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--wallet"
    ) as HTMLButtonElement | null;
    expect(walletBtn).not.toBeNull();
    const subW = walletBtn?.querySelector(
      ".preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(subW.textContent).toBe("Wallet");
    expect(walletBtn?.disabled).toBe(false);
    walletBtn?.click();
    expect(onWallet).toHaveBeenCalledTimes(1);
  });

  it("W button stays enabled regardless of proximity state", () => {
    const { root, refresh } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => true,
      getStructureProximityLabel: () => "SandMill Circle",
      getAmenityProximityLabel: () => "Shop",
      getAmenityItemActionLabel: () => "Buy",
      onAssist,
      onChat,
      onPushToTalk,
      onWallet,
    });
    refresh();
    const walletBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--wallet"
    ) as HTMLButtonElement;
    expect(walletBtn.disabled).toBe(false);
    walletBtn.click();
    expect(onWallet).toHaveBeenCalledTimes(1);
  });

  it("W button is safe to tap when no onWallet handler is provided", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const walletBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--wallet"
    ) as HTMLButtonElement;
    expect(() => walletBtn.click()).not.toThrow();
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

  it("relabels P for game-stage proximity and invokes onPushToTalk when activatable", () => {
    let label: string | null = null;
    let verb: string | null = null;
    const { root, refresh } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getGameStageProximityLabel: () => label,
      getGameStageProximityVerb: () => verb,
      getGameStageProximityActivatable: () => true,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(assistBtn.disabled).toBe(true);
    expect(pttBtn.disabled).toBe(true);
    label = "Chest";
    verb = "Open";
    refresh();
    expect(pttBtn.disabled).toBe(false);
    expect(subP.textContent).toBe("Open");
    expect(
      pttBtn.classList.contains("preview-proximity-touch-pad__key--proximity-active")
    ).toBe(true);
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
    expect(onAssist).not.toHaveBeenCalled();
  });

  it("shows game-stage verb on P but keeps it disabled when not activatable", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getGameStageProximityLabel: () => "Timer bar",
      getGameStageProximityVerb: () => "Hold Space",
      getGameStageProximityActivatable: () => false,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(pttBtn.disabled).toBe(true);
    expect(subP.textContent).toBe("Hold Space");
    expect(
      pttBtn.classList.contains("preview-proximity-touch-pad__key--proximity-hint")
    ).toBe(true);
  });

  it("game-stage proximity takes precedence over structure proximity", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getStructureProximityLabel: () => "Arcade",
      getGameStageProximityLabel: () => "Chest",
      getGameStageProximityVerb: () => "Open",
      getGameStageProximityActivatable: () => true,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    expect(pttBtn.disabled).toBe(false);
  });

  it("shows parking verb on P but keeps it disabled when spot is occupied", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getParkingProximityLabel: () => "Bay 1",
      getParkingProximityVerb: () => "Occupied",
      getParkingProximityActivatable: () => true,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(pttBtn.disabled).toBe(false);
    expect(subP.textContent).toBe("Occupied");
    expect(
      pttBtn.classList.contains("preview-proximity-touch-pad__key--proximity-active")
    ).toBe(true);
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("enables P for parking when spot is vacant", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getParkingProximityLabel: () => "Bay 2",
      getParkingProximityVerb: () => "Buy ticket",
      getParkingProximityActivatable: () => true,
      onAssist,
      onChat,
      onPushToTalk,
    });
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    const subP = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
    ) as HTMLElement;
    expect(pttBtn.disabled).toBe(false);
    expect(subP.textContent).toBe("Buy ticket");
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("vacant house: A disabled and P inspect enabled", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getHouseProximityLabel: () => "House 1",
      getHouseAssistVerb: () => "Enter",
      getHouseAssistActivatable: () => false,
      getHouseInspectVerb: () => "Inspect",
      onAssist,
      onChat,
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(true);
    expect(pttBtn.disabled).toBe(false);
    expect(
      root.querySelector(
        ".preview-proximity-touch-pad__key--ptt .preview-proximity-touch-pad__key-sub"
      )?.textContent
    ).toBe("Inspect");
    pttBtn.click();
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("owned viewer house: A enter and P inspect enabled", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getHouseProximityLabel: () => "House 2 · Alex",
      getHouseAssistVerb: () => "Enter",
      getHouseAssistActivatable: () => true,
      getHouseInspectVerb: () => "Inspect",
      onAssist,
      onChat,
      onPushToTalk,
    });
    const assistBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--assist"
    ) as HTMLButtonElement;
    const pttBtn = root.querySelector(
      ".preview-proximity-touch-pad__key--ptt"
    ) as HTMLButtonElement;
    expect(assistBtn.disabled).toBe(false);
    expect(pttBtn.disabled).toBe(false);
    assistBtn.click();
    pttBtn.click();
    expect(onAssist).toHaveBeenCalledTimes(1);
    expect(onPushToTalk).toHaveBeenCalledTimes(1);
  });

  it("owned other house: A disabled and P inspect enabled", () => {
    const { root } = createPreviewProximityTouchControls({
      parent,
      getBoundsElement: () => parent,
      getCanAct: () => false,
      getHouseProximityLabel: () => "House 3 · Alex",
      getHouseAssistVerb: () => "Enter",
      getHouseAssistActivatable: () => false,
      getHouseInspectVerb: () => "Inspect",
      onAssist,
      onChat,
      onPushToTalk,
    });
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
