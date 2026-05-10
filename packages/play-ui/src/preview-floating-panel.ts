/**
 * @module @agent-play/play-ui/preview-floating-panel
 * Draggable fullscreen overlay helpers for the preview canvas.
 */

export type PreviewFloatingPanelPlacement = {
  leftPx: number;
  topPx: number;
};

const WORLD_VIEWPORT_SCALE_MARGIN = 0.7;

export function syncPreviewCanvasHostScale(options: {
  stage: HTMLElement;
  host: HTMLElement;
  viewWidth: number;
  viewHeight: number;
}): void {
  const bounds = options.stage.getBoundingClientRect();
  const scale = Math.min(
    bounds.width / options.viewWidth,
    bounds.height / options.viewHeight
  );
  const resolvedScale =
    Number.isFinite(scale) && scale > 0
      ? scale * WORLD_VIEWPORT_SCALE_MARGIN
      : 1;
  options.host.style.left = "50%";
  options.host.style.top = "50%";
  options.host.style.transformOrigin = "center center";
  options.host.style.transform = `translate(-50%, -50%) scale(${resolvedScale})`;
}

export function attachPreviewFloatingPanelDrag(options: {
  element: HTMLElement;
  getBoundsElement: () => HTMLElement;
  label: string;
  initialPlacement: PreviewFloatingPanelPlacement;
  className?: string;
}): {
  dragHandle: HTMLButtonElement;
  refreshBounds: () => void;
} {
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "preview-floating-panel__drag";
  dragHandle.setAttribute("aria-label", `Move ${options.label} panel`);

  const grip = document.createElement("span");
  grip.className = "preview-floating-panel__drag-grip";
  grip.textContent = "\u22EE";

  const label = document.createElement("span");
  label.className = "preview-floating-panel__drag-label";
  label.textContent = options.label;
  dragHandle.append(grip, label);

  const body = document.createElement("div");
  body.className = "preview-floating-panel__body";
  while (options.element.firstChild !== null) {
    body.appendChild(options.element.firstChild);
  }

  options.element.classList.add("preview-floating-panel");
  if (options.className !== undefined) {
    options.element.classList.add(options.className);
  }
  options.element.append(dragHandle, body);
  options.element.style.left = `${options.initialPlacement.leftPx}px`;
  options.element.style.top = `${options.initialPlacement.topPx}px`;

  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragStartedAtX = 0;
  let dragStartedAtY = 0;
  let movedDuringPointer = false;
  let suppressNextClick = false;

  const setCollapsed = (collapsed: boolean): void => {
    options.element.classList.toggle("preview-floating-panel--collapsed", collapsed);
    dragHandle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    body.setAttribute("aria-hidden", collapsed ? "true" : "false");
  };

  setCollapsed(true);

  const moveToClientPoint = (event: PointerEvent): void => {
    const bounds = options.getBoundsElement().getBoundingClientRect();
    const panelRect = options.element.getBoundingClientRect();
    const maxLeft = Math.max(0, bounds.width - panelRect.width);
    const maxTop = Math.max(0, bounds.height - panelRect.height);
    const nextLeft = event.clientX - bounds.left - dragOffsetX;
    const nextTop = event.clientY - bounds.top - dragOffsetY;
    const movementDistance = Math.hypot(
      event.clientX - dragStartedAtX,
      event.clientY - dragStartedAtY
    );
    movedDuringPointer = movedDuringPointer || movementDistance > 3;
    options.element.style.left = `${Math.min(Math.max(0, nextLeft), maxLeft)}px`;
    options.element.style.top = `${Math.min(Math.max(0, nextTop), maxTop)}px`;
  };

  const refreshBounds = (): void => {
    const bounds = options.getBoundsElement().getBoundingClientRect();
    const panelRect = options.element.getBoundingClientRect();
    const currentLeft = Number.parseFloat(options.element.style.left || "0");
    const currentTop = Number.parseFloat(options.element.style.top || "0");
    const maxLeft = Math.max(0, bounds.width - panelRect.width);
    const maxTop = Math.max(0, bounds.height - panelRect.height);
    options.element.style.left = `${Math.min(Math.max(0, currentLeft), maxLeft)}px`;
    options.element.style.top = `${Math.min(Math.max(0, currentTop), maxTop)}px`;
  };

  const onPointerMove = (event: PointerEvent): void => {
    moveToClientPoint(event);
  };

  const finishPointer = (event: PointerEvent, shouldToggleOnTap: boolean): void => {
    dragHandle.removeEventListener("pointermove", onPointerMove);
    dragHandle.removeEventListener("pointerup", onPointerUp);
    dragHandle.removeEventListener("pointercancel", onPointerCancel);
    if (
      typeof dragHandle.hasPointerCapture === "function" &&
      typeof dragHandle.releasePointerCapture === "function" &&
      dragHandle.hasPointerCapture(event.pointerId)
    ) {
      dragHandle.releasePointerCapture(event.pointerId);
    }
    if (shouldToggleOnTap && !movedDuringPointer) {
      setCollapsed(
        !options.element.classList.contains("preview-floating-panel--collapsed")
      );
      suppressNextClick = true;
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    finishPointer(event, true);
  };

  const onPointerCancel = (event: PointerEvent): void => {
    finishPointer(event, false);
  };

  dragHandle.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const panelRect = options.element.getBoundingClientRect();
    dragOffsetX = event.clientX - panelRect.left;
    dragOffsetY = event.clientY - panelRect.top;
    dragStartedAtX = event.clientX;
    dragStartedAtY = event.clientY;
    movedDuringPointer = false;
    if (typeof dragHandle.setPointerCapture === "function") {
      dragHandle.setPointerCapture(event.pointerId);
    }
    dragHandle.addEventListener("pointermove", onPointerMove);
    dragHandle.addEventListener("pointerup", onPointerUp);
    dragHandle.addEventListener("pointercancel", onPointerCancel);
  });
  dragHandle.addEventListener("click", () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (movedDuringPointer) return;
    setCollapsed(
      !options.element.classList.contains("preview-floating-panel--collapsed")
    );
  });

  return { dragHandle, refreshBounds };
}
