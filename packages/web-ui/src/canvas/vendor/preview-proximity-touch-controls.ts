/**
 * @module @agent-play/play-ui/preview-proximity-touch-controls
 * Draggable Assist (A) and Chat (C) controls over the canvas.
 */

export type CreatePreviewProximityTouchControlsOptions = {
  parent: HTMLElement;
  getBoundsElement: () => HTMLElement;
  getCanAct: () => boolean;
  onAssist: () => void;
  onChat: () => void;
  onPushToTalk: () => void;
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

  row.append(btnAssist, btnChat, btnPushToTalk);
  root.append(dragHandle, row);
  options.parent.appendChild(root);

  let placedByDrag = false;

  const applyInteractable = (): void => {
    const can = options.getCanAct();
    btnAssist.disabled = !can;
    btnChat.disabled = !can;
    btnPushToTalk.disabled = !can;
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
