/**
 * @module @agent-play/play-ui/chat-message-deep-link
 * Shareable message links with temporary highlight on load.
 */

export const MESSAGE_DEEP_LINK_PARAM = "message";
export const MESSAGE_DEEP_LINK_HASH_PREFIX = "msg=";
export const DEFAULT_MESSAGE_HIGHLIGHT_MS = 2500;

const STYLE_ID = "agent-play-chat-message-deep-link-styles";

export function parseMessageDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get(MESSAGE_DEEP_LINK_PARAM);
    if (fromQuery !== null && fromQuery.trim().length > 0) {
      return fromQuery.trim();
    }
    const hash = parsed.hash.startsWith("#")
      ? parsed.hash.slice(1)
      : parsed.hash;
    if (hash.startsWith(MESSAGE_DEEP_LINK_HASH_PREFIX)) {
      const value = hash.slice(MESSAGE_DEEP_LINK_HASH_PREFIX.length).trim();
      return value.length > 0 ? decodeURIComponent(value) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildMessageDeepLink(options: {
  requestId: string;
  baseUrl: string;
}): string {
  const url = new URL(options.baseUrl);
  url.searchParams.set(MESSAGE_DEEP_LINK_PARAM, options.requestId);
  return url.toString();
}

function ensureHighlightStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.chat-message--highlight {
  animation: chat-message-highlight-pulse 2.5s ease;
  outline: 2px solid rgba(250, 204, 21, 0.95);
  outline-offset: 2px;
  background: rgba(250, 204, 21, 0.18) !important;
}
@keyframes chat-message-highlight-pulse {
  0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.55); }
  70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); }
  100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
}
`;
  document.head.append(style);
}

export function highlightMessageElement(
  element: HTMLElement,
  options: { durationMs?: number } = {}
): void {
  ensureHighlightStyles();
  const durationMs = options.durationMs ?? DEFAULT_MESSAGE_HIGHLIGHT_MS;
  element.classList.add("chat-message--highlight");
  window.setTimeout(() => {
    element.classList.remove("chat-message--highlight");
  }, durationMs);
}
