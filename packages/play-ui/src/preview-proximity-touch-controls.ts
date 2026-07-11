/**
 * @module @agent-play/play-ui/preview-proximity-touch-controls
 * Draggable Assist (A) and Chat (C) controls over the canvas.
 */

export type CreatePreviewProximityTouchControlsOptions = {
  parent: HTMLElement;
  getBoundsElement: () => HTMLElement;
  getCanAct: () => boolean;
  /**
   * When the human is near a structure / space, this returns the space's
   * display label (used to relabel the `A` button to "Enter"). Returns
   * `null` / `undefined` when no structure proximity is active. Optional;
   * undefined preserves the original agent-only behaviour.
   */
  getStructureProximityLabel?: () => string | null | undefined;
  /**
   * Verb shown on the `A` button when near a structure. Defaults to
   * `"Enter"`; game cabinets should return `"Play"`.
   */
  getStructureProximityVerb?: () => string | null | undefined;
  /**
   * When the human is inside the space yard and walks up to an amenity pad,
   * this returns the amenity's display label (used to relabel the `P`
   * button to "Enter"). Returns `null` / `undefined` when no amenity
   * proximity is active. Amenity proximity takes precedence over structure
   * proximity (the two are mutually exclusive in practice because they
   * happen on different stages, but the precedence is here for safety).
   */
  getAmenityProximityLabel?: () => string | null | undefined;
  /**
   * When the human is **inside** an amenity stage and standing next to a
   * purchasable item (shop / supermarket / car-wash), this returns a
   * short verb-action label for the `P` button — typically `"Buy"` or
   * `"View"` (for a sold item). Returning `null` / `undefined` leaves
   * the button on its default behaviour. Takes precedence over the
   * other proximity labels.
   */
  getAmenityItemActionLabel?: () => string | null | undefined;
  /**
   * When the human is on the overworld near a vacant parking bay, returns
   * the bay label for the `P` button.
   */
  getParkingProximityLabel?: () => string | null | undefined;
  /**
   * Verb shown on the `P` button when near a parking bay.
   */
  getParkingProximityVerb?: () => string | null | undefined;
  /**
   * When the human is inside an arcade game stage and near an interactable,
   * returns the object's display label for the `P` button.
   */
  getGameStageProximityLabel?: () => string | null | undefined;
  /**
   * Verb shown on the `P` button when near a game-stage interactable.
   */
  getGameStageProximityVerb?: () => string | null | undefined;
  /**
   * Whether the current game-stage proximity target can be activated with `P`.
   * Defaults to `true` when omitted.
   */
  getGameStageProximityActivatable?: () => boolean;
  onAssist: () => void;
  onChat: () => void;
  onPushToTalk: () => void;
  /**
   * Tap handler for the `W` (wallet) button. Always enabled — the wallet
   * inventory is global, so it can be inspected on any stage, regardless
   * of proximity state.
   */
  onWallet?: () => void;
};

export function createPreviewProximityTouchControls(
  options: CreatePreviewProximityTouchControlsOptions
): {
  root: HTMLElement;
  refresh: () => void;
} {
  const root = document.createElement("div");
  root.className = "preview-proximity-touch-pad";

  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "preview-proximity-touch-pad__drag";
  dragHandle.setAttribute("aria-label", "Move assist and chat controls");
  dragHandle.textContent = "\u22EE";

  const row = document.createElement("div");
  row.className = "preview-proximity-touch-pad__buttons";

  const btnAssist = document.createElement("button");
  btnAssist.type = "button";
  btnAssist.className =
    "preview-proximity-touch-pad__key preview-proximity-touch-pad__key--assist";
  const labelA = document.createElement("span");
  labelA.className = "preview-proximity-touch-pad__key-letter";
  labelA.textContent = "A";
  const subA = document.createElement("span");
  subA.className = "preview-proximity-touch-pad__key-sub";
  subA.textContent = "Assist";
  btnAssist.append(labelA, subA);

  const btnChat = document.createElement("button");
  btnChat.type = "button";
  btnChat.className =
    "preview-proximity-touch-pad__key preview-proximity-touch-pad__key--chat";
  const labelC = document.createElement("span");
  labelC.className = "preview-proximity-touch-pad__key-letter";
  labelC.textContent = "C";
  const subC = document.createElement("span");
  subC.className = "preview-proximity-touch-pad__key-sub";
  subC.textContent = "Chat";
  btnChat.append(labelC, subC);

  const btnPushToTalk = document.createElement("button");
  btnPushToTalk.type = "button";
  btnPushToTalk.className =
    "preview-proximity-touch-pad__key preview-proximity-touch-pad__key--ptt";
  const labelP = document.createElement("span");
  labelP.className = "preview-proximity-touch-pad__key-letter";
  labelP.textContent = "P";
  const subP = document.createElement("span");
  subP.className = "preview-proximity-touch-pad__key-sub";
  subP.textContent = "Push";
  btnPushToTalk.append(labelP, subP);

  const btnWallet = document.createElement("button");
  btnWallet.type = "button";
  btnWallet.className =
    "preview-proximity-touch-pad__key preview-proximity-touch-pad__key--wallet";
  btnWallet.setAttribute("aria-label", "Open wallet inventory");
  const labelW = document.createElement("span");
  labelW.className = "preview-proximity-touch-pad__key-letter";
  labelW.textContent = "W";
  const subW = document.createElement("span");
  subW.className = "preview-proximity-touch-pad__key-sub";
  subW.textContent = "Wallet";
  btnWallet.append(labelW, subW);

  row.append(btnAssist, btnChat, btnPushToTalk, btnWallet);
  root.append(dragHandle, row);
  options.parent.appendChild(root);

  let placedByDrag = false;

  const applyInteractable = (): void => {
    const can = options.getCanAct();
    const itemActionLabel = options.getAmenityItemActionLabel?.() ?? null;
    const nearAmenityItem =
      typeof itemActionLabel === "string" && itemActionLabel.length > 0;
    const amenityLabel = options.getAmenityProximityLabel?.() ?? null;
    const nearAmenity =
      typeof amenityLabel === "string" && amenityLabel.length > 0;
    const gameStageLabel = options.getGameStageProximityLabel?.() ?? null;
    const nearGameStage =
      typeof gameStageLabel === "string" && gameStageLabel.length > 0;
    const parkingLabel = options.getParkingProximityLabel?.() ?? null;
    const nearParking =
      typeof parkingLabel === "string" && parkingLabel.length > 0;
    const structureLabel = options.getStructureProximityLabel?.() ?? null;
    const nearStructure =
      typeof structureLabel === "string" && structureLabel.length > 0;
    if (nearAmenityItem) {
      btnAssist.disabled = true;
      subA.textContent = "Assist";
      btnAssist.removeAttribute("aria-label");
      btnChat.disabled = true;
      btnPushToTalk.disabled = false;
      subP.textContent = itemActionLabel ?? "Buy";
      btnPushToTalk.classList.add("preview-proximity-touch-pad__key--proximity-active");
      btnPushToTalk.classList.remove("preview-proximity-touch-pad__key--proximity-hint");
      btnPushToTalk.setAttribute(
        "aria-label",
        `${itemActionLabel ?? "Buy"} amenity item`
      );
    } else if (nearAmenity) {
      btnAssist.disabled = true;
      subA.textContent = "Assist";
      btnAssist.removeAttribute("aria-label");
      btnChat.disabled = true;
      btnPushToTalk.disabled = false;
      subP.textContent = "Enter";
      btnPushToTalk.classList.add("preview-proximity-touch-pad__key--proximity-active");
      btnPushToTalk.classList.remove("preview-proximity-touch-pad__key--proximity-hint");
      btnPushToTalk.setAttribute(
        "aria-label",
        `Enter ${amenityLabel ?? "amenity"}`
      );
    } else if (nearGameStage) {
      const verb = options.getGameStageProximityVerb?.() ?? "Use";
      const activatable = options.getGameStageProximityActivatable?.() ?? true;
      btnAssist.disabled = true;
      subA.textContent = "Assist";
      btnAssist.removeAttribute("aria-label");
      btnChat.disabled = true;
      btnPushToTalk.disabled = !activatable;
      subP.textContent = verb;
      btnPushToTalk.classList.toggle(
        "preview-proximity-touch-pad__key--proximity-active",
        activatable
      );
      btnPushToTalk.classList.toggle(
        "preview-proximity-touch-pad__key--proximity-hint",
        !activatable
      );
      if (activatable) {
        btnPushToTalk.setAttribute(
          "aria-label",
          `${verb} ${gameStageLabel ?? "object"}`
        );
      } else {
        btnPushToTalk.setAttribute("aria-label", verb);
      }
    } else if (nearParking) {
      const verb = options.getParkingProximityVerb?.() ?? "Buy ticket";
      btnAssist.disabled = true;
      subA.textContent = "Assist";
      btnAssist.removeAttribute("aria-label");
      btnChat.disabled = true;
      btnPushToTalk.disabled = false;
      subP.textContent = verb;
      btnPushToTalk.classList.add("preview-proximity-touch-pad__key--proximity-active");
      btnPushToTalk.classList.remove("preview-proximity-touch-pad__key--proximity-hint");
      btnPushToTalk.setAttribute(
        "aria-label",
        `${verb} ${parkingLabel ?? "parking"}`
      );
    } else if (nearStructure) {
      const verb = options.getStructureProximityVerb?.() ?? "Enter";
      btnAssist.disabled = false;
      subA.textContent = verb;
      btnAssist.setAttribute(
        "aria-label",
        `${verb} ${structureLabel ?? "space"}`
      );
      btnChat.disabled = true;
      btnPushToTalk.disabled = true;
      subP.textContent = "Push";
      btnPushToTalk.classList.remove(
        "preview-proximity-touch-pad__key--proximity-active",
        "preview-proximity-touch-pad__key--proximity-hint"
      );
      btnPushToTalk.removeAttribute("aria-label");
    } else {
      btnAssist.disabled = !can;
      subA.textContent = "Assist";
      btnAssist.removeAttribute("aria-label");
      btnChat.disabled = !can;
      btnPushToTalk.disabled = !can;
      subP.textContent = "Push";
      btnPushToTalk.classList.remove(
        "preview-proximity-touch-pad__key--proximity-active",
        "preview-proximity-touch-pad__key--proximity-hint"
      );
      btnPushToTalk.removeAttribute("aria-label");
    }
  };

  const refresh = (): void => {
    applyInteractable();
  };

  btnAssist.addEventListener("click", () => {
    if (btnAssist.disabled) return;
    options.onAssist();
  });
  btnChat.addEventListener("click", () => {
    if (btnChat.disabled) return;
    options.onChat();
  });
  btnPushToTalk.addEventListener("click", () => {
    if (btnPushToTalk.disabled) return;
    options.onPushToTalk();
  });
  btnWallet.addEventListener("click", () => {
    if (typeof options.onWallet === "function") options.onWallet();
  });

  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const onPointerMove = (e: PointerEvent): void => {
    const bounds = options.getBoundsElement().getBoundingClientRect();
    const padRect = root.getBoundingClientRect();
    const w = padRect.width;
    const h = padRect.height;
    let left = e.clientX - bounds.left - dragOffsetX;
    let top = e.clientY - bounds.top - dragOffsetY;
    const maxLeft = Math.max(0, bounds.width - w);
    const maxTop = Math.max(0, bounds.height - h);
    left = Math.min(Math.max(0, left), maxLeft);
    top = Math.min(Math.max(0, top), maxTop);
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.transform = "none";
    placedByDrag = true;
  };

  const onPointerUp = (e: PointerEvent): void => {
    dragHandle.removeEventListener("pointermove", onPointerMove);
    dragHandle.removeEventListener("pointerup", onPointerUp);
    dragHandle.removeEventListener("pointercancel", onPointerUp);
    if (dragHandle.hasPointerCapture(e.pointerId)) {
      dragHandle.releasePointerCapture(e.pointerId);
    }
  };

  dragHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bounds = options.getBoundsElement().getBoundingClientRect();
    const padRect = root.getBoundingClientRect();
    if (!placedByDrag) {
      const currentLeft = padRect.left - bounds.left;
      const currentTop = padRect.top - bounds.top;
      root.style.left = `${currentLeft}px`;
      root.style.top = `${currentTop}px`;
      root.style.transform = "none";
      placedByDrag = true;
    }
    dragOffsetX = e.clientX - padRect.left;
    dragOffsetY = e.clientY - padRect.top;
    dragHandle.setPointerCapture(e.pointerId);
    dragHandle.addEventListener("pointermove", onPointerMove);
    dragHandle.addEventListener("pointerup", onPointerUp);
    dragHandle.addEventListener("pointercancel", onPointerUp);
  });

  refresh();

  return { root, refresh };
}
