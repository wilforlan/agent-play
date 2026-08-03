import type { WorldNotificationPayload } from "@agent-play/intercom";

export const NOTIFICATION_TRAY_AUTO_DISMISS_MS = 10_000;
export const NOTIFICATION_TRAY_WIDE_MEDIA_QUERY = "(min-width: 1024px)";
export const NOTIFICATION_TRAY_DEFAULT_WIDTH_PX = 280;
export const NOTIFICATION_TRAY_DEFAULT_GAP_PX = 12;

export type NotificationTrayLayoutMode = "panel" | "toast";

export type NotificationTrayPlacementInput = {
  readonly anchorRect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly preferredWidthPx?: number;
  readonly gapPx?: number;
};

export type NotificationTrayPlacement = {
  readonly leftPx: number;
  readonly topPx: number;
  readonly widthPx: number;
};

export type NotificationTrayHandle = {
  readonly root: HTMLElement;
  push(notification: WorldNotificationPayload): void;
  dismiss(id: string): void;
  clear(): void;
  destroy(): void;
  getLayoutMode(): NotificationTrayLayoutMode;
  setLayoutMode(mode: NotificationTrayLayoutMode): void;
  refreshPlacement(geometry: NotificationTrayPlacementInput): void;
};

export type CreateNotificationTrayOptions = {
  readonly parent: HTMLElement;
  readonly autoDismissMs?: number;
  readonly now?: () => number;
  readonly layoutMode?: NotificationTrayLayoutMode;
  readonly syncLayoutToViewport?: boolean;
};

const STYLE_ID = "preview-notification-tray-styles";
const TRAY_CLASS = "preview-notification-tray";
const PANEL_CLASS = `${TRAY_CLASS}--panel`;
const TOAST_CLASS = `${TRAY_CLASS}--toast`;
const VIEWPORT_PADDING_PX = 8;

export const computeNotificationTrayPlacement = (
  input: NotificationTrayPlacementInput
): NotificationTrayPlacement => {
  const preferredWidth =
    input.preferredWidthPx ?? NOTIFICATION_TRAY_DEFAULT_WIDTH_PX;
  const gap = input.gapPx ?? NOTIFICATION_TRAY_DEFAULT_GAP_PX;
  const widthPx = Math.max(
    0,
    Math.min(preferredWidth, input.anchorRect.width, input.viewport.width - VIEWPORT_PADDING_PX * 2)
  );
  const desiredLeft = input.anchorRect.left;
  const maxLeft = Math.max(0, input.viewport.width - widthPx - VIEWPORT_PADDING_PX);
  const leftPx = Math.max(0, Math.min(desiredLeft, maxLeft));
  const desiredTop = input.anchorRect.top + input.anchorRect.height + gap;
  const maxTop = Math.max(0, input.viewport.height - VIEWPORT_PADDING_PX);
  const topPx = Math.max(0, Math.min(desiredTop, maxTop));
  return { leftPx, topPx, widthPx };
};

const ensureStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${TRAY_CLASS} {
  z-index: 13000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: min(${NOTIFICATION_TRAY_DEFAULT_WIDTH_PX}px, calc(100vw - 24px));
  pointer-events: none;
  box-sizing: border-box;
}
.${PANEL_CLASS} {
  position: fixed;
  max-width: none;
}
.${TOAST_CLASS} {
  position: fixed;
  top: max(12px, calc(12px + env(safe-area-inset-top, 0px)));
  left: 50%;
  transform: translateX(-50%);
  width: min(${NOTIFICATION_TRAY_DEFAULT_WIDTH_PX}px, calc(100vw - 24px));
}
.${TRAY_CLASS}__item {
  pointer-events: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.94);
  color: #e2e8f0;
  padding: 10px 12px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
  min-width: 0;
  overflow-wrap: anywhere;
}
.${TRAY_CLASS}__item:focus-within,
.${TRAY_CLASS}__item:hover {
  border-color: rgba(96, 165, 250, 0.65);
}
.${TRAY_CLASS}__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  min-width: 0;
}
.${TRAY_CLASS}__title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.${TRAY_CLASS}__dismiss {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.${TRAY_CLASS}__dismiss:hover {
  color: #f8fafc;
}
.${TRAY_CLASS}__description {
  font-size: 12px;
  line-height: 1.35;
  color: #cbd5e1;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.${TRAY_CLASS}__meta {
  margin-top: 6px;
  font-size: 10px;
  color: #94a3b8;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
`;
  document.head.appendChild(style);
};

const formatMetadata = (
  metadata: Record<string, unknown>
): string | null => {
  const parts: string[] = [];
  const reactionKind = metadata.reactionKind;
  if (typeof reactionKind === "string" && reactionKind.length > 0) {
    parts.push(reactionKind === "thumbs_up" ? "like" : reactionKind);
  }
  const messagePreview = metadata.messagePreview;
  if (typeof messagePreview === "string" && messagePreview.length > 0) {
    parts.push(messagePreview);
  }
  const replyPreview = metadata.replyPreview;
  if (typeof replyPreview === "string" && replyPreview.length > 0) {
    parts.push(replyPreview);
  }
  const displayName = metadata.displayName;
  if (typeof displayName === "string" && displayName.length > 0) {
    parts.push(displayName);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
};

type ActiveNotification = {
  readonly id: string;
  readonly element: HTMLElement;
  focused: boolean;
  timerId: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  deadlineAt: number | null;
};

const clearInlinePlacement = (root: HTMLElement): void => {
  root.style.left = "";
  root.style.top = "";
  root.style.width = "";
};

export const createNotificationTray = (
  options: CreateNotificationTrayOptions
): NotificationTrayHandle => {
  ensureStyles();
  const autoDismissMs =
    options.autoDismissMs ?? NOTIFICATION_TRAY_AUTO_DISMISS_MS;
  const now = options.now ?? (() => Date.now());
  const root = document.createElement("div");
  root.className = TRAY_CLASS;
  root.setAttribute("aria-label", "Notifications");
  root.setAttribute("role", "region");
  options.parent.appendChild(root);

  let layoutMode: NotificationTrayLayoutMode =
    options.layoutMode ??
    (typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(NOTIFICATION_TRAY_WIDE_MEDIA_QUERY).matches
      ? "panel"
      : "toast");

  const applyLayoutMode = (mode: NotificationTrayLayoutMode): void => {
    layoutMode = mode;
    root.classList.toggle(PANEL_CLASS, mode === "panel");
    root.classList.toggle(TOAST_CLASS, mode === "toast");
    if (mode === "toast") {
      clearInlinePlacement(root);
    }
  };
  applyLayoutMode(layoutMode);

  let mediaQuery: MediaQueryList | null = null;
  let onMediaChange: ((event: MediaQueryListEvent) => void) | null = null;
  if (
    options.syncLayoutToViewport === true &&
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    mediaQuery = window.matchMedia(NOTIFICATION_TRAY_WIDE_MEDIA_QUERY);
    applyLayoutMode(mediaQuery.matches ? "panel" : "toast");
    onMediaChange = (event: MediaQueryListEvent): void => {
      applyLayoutMode(event.matches ? "panel" : "toast");
    };
    mediaQuery.addEventListener("change", onMediaChange);
  }

  const active = new Map<string, ActiveNotification>();

  const clearTimer = (entry: ActiveNotification): void => {
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
  };

  const removeEntry = (id: string): void => {
    const entry = active.get(id);
    if (entry === undefined) {
      return;
    }
    clearTimer(entry);
    entry.element.remove();
    active.delete(id);
  };

  const scheduleDismiss = (entry: ActiveNotification): void => {
    clearTimer(entry);
    if (entry.focused) {
      entry.deadlineAt = null;
      return;
    }
    const delay = Math.max(0, entry.remainingMs);
    entry.deadlineAt = now() + delay;
    entry.timerId = setTimeout(() => {
      removeEntry(entry.id);
    }, delay);
  };

  const focusEntry = (entry: ActiveNotification): void => {
    if (entry.focused) {
      return;
    }
    if (entry.deadlineAt !== null) {
      entry.remainingMs = Math.max(0, entry.deadlineAt - now());
    }
    entry.focused = true;
    clearTimer(entry);
    entry.deadlineAt = null;
  };

  const unfocusEntry = (entry: ActiveNotification): void => {
    if (!entry.focused) {
      return;
    }
    entry.focused = false;
    if (entry.remainingMs <= 0) {
      removeEntry(entry.id);
      return;
    }
    scheduleDismiss(entry);
  };

  return {
    root,
    getLayoutMode() {
      return layoutMode;
    },
    setLayoutMode(mode) {
      applyLayoutMode(mode);
    },
    refreshPlacement(geometry) {
      if (layoutMode !== "panel") {
        clearInlinePlacement(root);
        return;
      }
      const placement = computeNotificationTrayPlacement(geometry);
      root.style.left = `${placement.leftPx}px`;
      root.style.top = `${placement.topPx}px`;
      root.style.width = `${placement.widthPx}px`;
    },
    push(notification) {
      removeEntry(notification.id);
      const item = document.createElement("article");
      item.className = `${TRAY_CLASS}__item`;
      item.dataset.notificationId = notification.id;
      item.tabIndex = 0;

      const header = document.createElement("div");
      header.className = `${TRAY_CLASS}__header`;
      const title = document.createElement("div");
      title.className = `${TRAY_CLASS}__title`;
      title.textContent = notification.title;
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = `${TRAY_CLASS}__dismiss`;
      dismiss.setAttribute("aria-label", "Dismiss notification");
      dismiss.textContent = "x";
      dismiss.addEventListener("click", () => {
        removeEntry(notification.id);
      });
      header.append(title, dismiss);

      const description = document.createElement("div");
      description.className = `${TRAY_CLASS}__description`;
      description.textContent = notification.description;

      item.append(header, description);
      const metaText = formatMetadata(notification.metadata);
      if (metaText !== null) {
        const meta = document.createElement("div");
        meta.className = `${TRAY_CLASS}__meta`;
        meta.textContent = metaText;
        item.appendChild(meta);
      }

      const entry: ActiveNotification = {
        id: notification.id,
        element: item,
        focused: false,
        timerId: null,
        remainingMs: autoDismissMs,
        deadlineAt: null,
      };

      item.addEventListener("mouseenter", () => {
        focusEntry(entry);
      });
      item.addEventListener("mouseleave", () => {
        unfocusEntry(entry);
      });
      item.addEventListener("focusin", () => {
        focusEntry(entry);
      });
      item.addEventListener("focusout", () => {
        queueMicrotask(() => {
          if (!item.contains(document.activeElement)) {
            unfocusEntry(entry);
          }
        });
      });

      root.prepend(item);
      active.set(notification.id, entry);
      scheduleDismiss(entry);
    },
    dismiss(id) {
      removeEntry(id);
    },
    clear() {
      for (const id of [...active.keys()]) {
        removeEntry(id);
      }
    },
    destroy() {
      for (const id of [...active.keys()]) {
        removeEntry(id);
      }
      if (mediaQuery !== null && onMediaChange !== null) {
        mediaQuery.removeEventListener("change", onMediaChange);
      }
      root.remove();
    },
  };
};
