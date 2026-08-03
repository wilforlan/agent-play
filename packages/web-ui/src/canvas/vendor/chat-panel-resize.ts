/**
 * @module @agent-play/play-ui/chat-panel-resize
 * Edge drag-resize for messaging panels on larger screens.
 */

export const LARGE_SCREEN_PANEL_RESIZE_MIN_WIDTH_PX = 900;

const STYLE_ID = "agent-play-chat-panel-resize-styles";

export type ChatPanelSize = {
  widthPx: number;
  heightPx: number;
};

export function isLargeScreenForPanelResize(viewportWidthPx: number): boolean {
  return (
    Number.isFinite(viewportWidthPx) &&
    viewportWidthPx >= LARGE_SCREEN_PANEL_RESIZE_MIN_WIDTH_PX
  );
}

export function clampChatPanelSize(options: {
  widthPx: number;
  heightPx: number;
  minWidthPx: number;
  maxWidthPx: number;
  minHeightPx: number;
  maxHeightPx: number;
}): ChatPanelSize {
  return {
    widthPx: Math.min(
      options.maxWidthPx,
      Math.max(options.minWidthPx, Math.round(options.widthPx))
    ),
    heightPx: Math.min(
      options.maxHeightPx,
      Math.max(options.minHeightPx, Math.round(options.heightPx))
    ),
  };
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.chat-panel-resize__handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  border: 0;
  padding: 0;
  cursor: nwse-resize;
  background:
    linear-gradient(135deg, transparent 55%, rgba(148, 163, 184, 0.95) 55%),
    linear-gradient(135deg, transparent 70%, rgba(148, 163, 184, 0.7) 70%);
  background-color: transparent;
  border-radius: 2px;
}
.chat-panel-resize__handle:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.9);
  outline-offset: 1px;
}
`;
  document.head.append(style);
}

export function attachChatPanelResize(options: {
  panel: HTMLElement;
  enabled: boolean;
  getSize: () => ChatPanelSize;
  onResize: (size: ChatPanelSize) => void;
  minWidthPx: number;
  maxWidthPx: number;
  minHeightPx: number;
  maxHeightPx: number;
}): { destroy: () => void } {
  ensureStyles();
  const previousPosition = options.panel.style.position;
  if (getComputedStyle(options.panel).position === "static") {
    options.panel.style.position = "relative";
  }

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "chat-panel-resize__handle";
  handle.setAttribute("aria-label", "Resize chat panel");
  handle.hidden = !options.enabled;

  let dragging = false;
  let originX = 0;
  let originY = 0;
  let originWidth = 0;
  let originHeight = 0;

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    const next = clampChatPanelSize({
      widthPx: originWidth + (event.clientX - originX),
      heightPx: originHeight + (event.clientY - originY),
      minWidthPx: options.minWidthPx,
      maxWidthPx: options.maxWidthPx,
      minHeightPx: options.minHeightPx,
      maxHeightPx: options.maxHeightPx,
    });
    options.onResize(next);
  };

  const onPointerUp = (): void => {
    if (!dragging) return;
    dragging = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (!options.enabled || handle.hidden) return;
    event.preventDefault();
    const size = options.getSize();
    dragging = true;
    originX = event.clientX;
    originY = event.clientY;
    originWidth = size.widthPx;
    originHeight = size.heightPx;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  options.panel.append(handle);

  return {
    destroy: () => {
      onPointerUp();
      handle.remove();
      options.panel.style.position = previousPosition;
    },
  };
}
