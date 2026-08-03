import { reportPresentationEvent } from "./presentation-analytics.js";
import { createChatComposer } from "./chat-composer.js";
import { createChatMessageActions } from "./chat-message-actions.js";
import {
  buildMessageDeepLink,
  highlightMessageElement,
  parseMessageDeepLink,
} from "./chat-message-deep-link.js";
import {
  applyMessageReaction,
  createEmptyMessageReactions,
  normalizeMessageReactions,
  type MessageReactionAction,
  type MessageReactionKind,
  type MessageReactions,
} from "./chat-message-reactions.js";
import {
  attachChatPanelResize,
  isLargeScreenForPanelResize,
} from "./chat-panel-resize.js";
import {
  canReplyToDepth,
  sortThreadedMessages,
  type ReplyDepth,
} from "./chat-reply-threading.js";

const STYLE_ID = "agent-play-preview-global-chat-room-styles";
const INITIAL_PAGE_SIZE = 100;
const MAX_GLOBAL_LINES = 5000;
const WORLD_CHAT_PUBLISH_OP = "worldChatPublish";
const WORLD_CHAT_HISTORY_OP = "worldChatHistory";
const WORLD_CHAT_REACT_OP = "worldChatReact";
const P2A_HELP_PATH = "/agent-play-p2a-implementation";

export type GlobalChatLine = {
  seq: number;
  requestId: string;
  fromPlayerId: string;
  senderName: string;
  message: string;
  messageKind: "text" | "audio" | "media";
  audio?: {
    encoding?: string;
    dataBase64?: string;
    durationMs?: number;
  };
  media?: {
    mediaType?: string;
    url: string;
    title?: string;
  };
  ts: string;
  parentRequestId: string | null;
  depth: ReplyDepth;
  reactions: MessageReactions;
};

type WorldChatHistoryResponse = {
  messages: Array<{
    seq: number;
    requestId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
    parentRequestId?: string;
    depth?: number;
    reactions?: unknown;
  }>;
  hasMore: boolean;
  totalCount: number;
};

export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  if (count < 1000) return `${Math.floor(count)}`;
  if (count < 1_000_000) {
    const value = count / 1000;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}K`;
  }
  if (count < 1_000_000_000) {
    const value = count / 1_000_000;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}M`;
  }
  const value = count / 1_000_000_000;
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}B`;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.preview-global-chat-room {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 280px;
  max-height: min(70vh, 640px);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.9));
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
.preview-global-chat-room.preview-floating-panel {
  width: var(--world-chat-panel-w, min(360px, calc(100vw - 24px)));
  max-height: var(--world-chat-panel-h, min(70vh, 640px));
  height: auto;
  min-height: 0;
}
.preview-global-chat-room.preview-floating-panel--collapsed {
  width: min(360px, calc(100vw - 24px));
  height: auto;
  min-height: 0;
  max-height: 58px;
  overflow: hidden;
}
.preview-global-chat-room.preview-floating-panel--collapsed .chat-panel-resize__handle {
  display: none;
}
.preview-global-chat-room__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.preview-global-chat-room__title {
  margin: 0;
  font-size: 13px;
  color: #f8fafc;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
}
.preview-global-chat-room__count {
  font-size: 12px;
  color: #fde68a;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}
.preview-global-chat-room__title-tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.preview-global-chat-room__p2a-toggle-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #dbeafe;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
.preview-global-chat-room__p2a-toggle {
  margin: 0;
}
.preview-global-chat-room__help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(147, 197, 253, 0.65);
  color: #dbeafe;
  text-decoration: none;
  font-size: 10px;
  line-height: 1;
}
.preview-global-chat-room__p2a-panel {
  display: grid;
  gap: 6px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  padding: 8px;
}
.preview-global-chat-room__p2a-copy {
  font-size: 12px;
  color: #bfdbfe;
  line-height: 1.4;
}
.preview-global-chat-room__address-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 6px;
}
.preview-global-chat-room__address-input {
  border-radius: 6px;
  border: 1px solid rgba(125, 211, 252, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  font-size: 12px;
  padding: 6px;
}
.preview-global-chat-room__address-copy,
.preview-global-chat-room__address-share {
  border-radius: 6px;
  border: 1px solid rgba(147, 197, 253, 0.65);
  background: rgba(30, 64, 175, 0.48);
  color: #eff6ff;
  font-size: 11px;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  padding: 6px 8px;
  cursor: pointer;
}
.preview-global-chat-room__list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding-right: 4px;
}
.preview-global-chat-room__line {
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
}
.preview-global-chat-room__line--self {
  border-color: rgba(74, 222, 128, 0.45);
  background: rgba(20, 83, 45, 0.42);
}
.preview-global-chat-room__line--depth-1 {
  margin-left: 14px;
  border-left: 2px solid rgba(125, 211, 252, 0.55);
}
.preview-global-chat-room__line--depth-2 {
  margin-left: 28px;
  border-left: 2px solid rgba(167, 139, 250, 0.55);
}
.preview-global-chat-room__meta {
  display: block;
  font-size: 11px;
  color: #bae6fd;
  margin-bottom: 4px;
  letter-spacing: 0.01em;
}
.preview-global-chat-room__reply-ref {
  display: block;
  font-size: 11px;
  color: #93c5fd;
  margin-bottom: 4px;
}
.preview-global-chat-room__message {
  font-size: 14px;
  color: #f8fafc;
  line-height: 1.5;
  letter-spacing: 0.01em;
  white-space: pre-wrap;
  word-break: break-word;
}
`;
  document.head.append(style);
}

function trimToNonEmpty(value: string): string {
  return value.trim();
}

function isValidIntercomAddress(value: string | null): value is string {
  if (value === null) return false;
  const trimmed = value.trim();
  const delimiterIndex = trimmed.indexOf("://");
  if (delimiterIndex <= 0) return false;
  const protocol = trimmed.slice(0, delimiterIndex).trim().toLowerCase();
  const id = trimmed.slice(delimiterIndex + 3).trim();
  return protocol.endsWith("-intercom") && id.length > 0;
}

function toTimestampLabel(ts: string): string {
  const date = new Date(ts);
  return Number.isNaN(date.valueOf()) ? ts : date.toLocaleTimeString();
}

function toReplyDepth(value: unknown): ReplyDepth {
  if (value === 1 || value === 2) return value;
  return 0;
}

export function createPreviewGlobalChatRoom(options: {
  apiBase: string;
  getSid: () => string | null;
  getMainNodeId: () => string | null;
  resolveSenderName: (fromPlayerId: string) => string;
  getP2aEnabled: () => boolean;
  setP2aEnabled: (enabled: boolean) => void;
  getIntercomAddress: () => string | null;
  ensureIntercomAddress: () => string | null;
}): {
  element: HTMLElement;
  appendFromIntercomEvent: (input: {
    seq?: number;
    requestId: string;
    fromPlayerId: string;
    message?: string;
    messageKind?: "text" | "audio" | "media";
    audio?: {
      encoding?: string;
      dataBase64?: string;
      durationMs?: number;
    };
    media?: {
      mediaType?: string;
      url: string;
      title?: string;
    };
    ts: string;
    totalCount?: number;
    parentRequestId?: string | null;
    depth?: number;
    reactions?: unknown;
    reactionUpdate?: boolean;
  }) => void;
  getLines: () => readonly GlobalChatLine[];
  refreshP2a: () => void;
  focusMessage: (requestId: string) => boolean;
} {
  ensureStyles();
  const root = document.createElement("section");
  root.className = "preview-global-chat-room";
  const titleRow = document.createElement("div");
  titleRow.className = "preview-global-chat-room__title-row";
  const title = document.createElement("h3");
  title.className = "preview-global-chat-room__title";
  title.textContent = "World chat room";
  const count = document.createElement("span");
  count.className = "preview-global-chat-room__count";
  count.textContent = "0";
  const titleTools = document.createElement("div");
  titleTools.className = "preview-global-chat-room__title-tools";
  const p2aWrap = document.createElement("label");
  p2aWrap.className = "preview-global-chat-room__p2a-toggle-wrap";
  p2aWrap.title = "enable P2A audio communication";
  const p2aToggle = document.createElement("input");
  p2aToggle.type = "checkbox";
  p2aToggle.className = "preview-global-chat-room__p2a-toggle";
  p2aToggle.checked = options.getP2aEnabled();
  const p2aText = document.createElement("span");
  p2aText.textContent = "P2A";
  p2aWrap.append(p2aToggle, p2aText);
  const helpLink = document.createElement("a");
  helpLink.className = "preview-global-chat-room__help-link";
  helpLink.href = P2A_HELP_PATH;
  helpLink.target = "_blank";
  helpLink.rel = "noreferrer";
  helpLink.textContent = "?";
  helpLink.setAttribute("aria-label", "P2A help");
  titleTools.append(count, p2aWrap, helpLink);
  titleRow.append(title, titleTools);
  const p2aPanel = document.createElement("div");
  p2aPanel.className = "preview-global-chat-room__p2a-panel";
  p2aPanel.hidden = true;
  const p2aCopy = document.createElement("div");
  p2aCopy.className = "preview-global-chat-room__p2a-copy";
  p2aCopy.textContent =
    "Share this intercom-address for peer connection and conferencing.";
  const addressRow = document.createElement("div");
  addressRow.className = "preview-global-chat-room__address-row";
  const addressInput = document.createElement("input");
  addressInput.className = "preview-global-chat-room__address-input";
  addressInput.readOnly = true;
  const addressCopy = document.createElement("button");
  addressCopy.type = "button";
  addressCopy.className = "preview-global-chat-room__address-copy";
  addressCopy.textContent = "Copy";
  const addressShare = document.createElement("button");
  addressShare.type = "button";
  addressShare.className = "preview-global-chat-room__address-share";
  addressShare.textContent = "Share";
  addressRow.append(addressInput, addressCopy, addressShare);
  p2aPanel.append(p2aCopy, addressRow);
  const list = document.createElement("div");
  list.className = "preview-global-chat-room__list";

  let lines: GlobalChatLine[] = [];
  let knownRequestIds = new Set<string>();
  let totalCount = 0;
  let hasMore = false;
  let loadingOlder = false;
  let loadingInitial = false;
  let panelWidthPx = 360;
  let panelHeightPx = 420;

  const composer = createChatComposer({
    placeholder: "Say something to everyone...",
    onSubmit: ({ text, parentRequestId }) => {
      void sendMessage(text, parentRequestId);
    },
  });

  root.append(titleRow, p2aPanel, list, composer.element);

  const renderCount = (): void => {
    count.textContent = formatCompactCount(totalCount);
  };

  const renderP2aPanel = (): void => {
    const enabled = options.getP2aEnabled();
    p2aToggle.checked = enabled;
    p2aPanel.hidden = !enabled;
    p2aPanel.style.display = enabled ? "grid" : "none";
    const existingAddress = options.getIntercomAddress();
    const address =
      enabled && !isValidIntercomAddress(existingAddress)
        ? options.ensureIntercomAddress()
        : existingAddress;
    addressInput.value = address ?? "";
    const validAddress = isValidIntercomAddress(address);
    addressCopy.disabled = !enabled || !validAddress;
    addressShare.disabled = !enabled || !validAddress;
  };

  const applyPanelSize = (): void => {
    root.style.removeProperty("width");
    root.style.removeProperty("height");
    root.style.removeProperty("max-height");
    root.style.setProperty("--world-chat-panel-w", `${panelWidthPx}px`);
    root.style.setProperty("--world-chat-panel-h", `${panelHeightPx}px`);
  };

  attachChatPanelResize({
    panel: root,
    enabled: isLargeScreenForPanelResize(window.innerWidth),
    getSize: () => ({ widthPx: panelWidthPx, heightPx: panelHeightPx }),
    onResize: (next) => {
      panelWidthPx = next.widthPx;
      panelHeightPx = next.heightPx;
      applyPanelSize();
    },
    minWidthPx: 280,
    maxWidthPx: 560,
    minHeightPx: 280,
    maxHeightPx: 640,
  });
  applyPanelSize();

  const focusMessage = (requestId: string): boolean => {
    const rows = list.querySelectorAll<HTMLElement>("[data-request-id]");
    let row: HTMLElement | null = null;
    for (const candidate of rows) {
      if (candidate.dataset.requestId === requestId) {
        row = candidate;
        break;
      }
    }
    if (row === null) return false;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightMessageElement(row);
    return true;
  };

  const copyMessageLink = async (requestId: string): Promise<void> => {
    const link = buildMessageDeepLink({
      requestId,
      baseUrl: window.location.href,
    });
    await navigator.clipboard?.writeText(link);
  };

  const reactToMessage = async (input: {
    requestId: string;
    kind: MessageReactionKind;
    action: MessageReactionAction;
  }): Promise<void> => {
    const sid = options.getSid();
    const mainNodeId = options.getMainNodeId();
    if (sid === null || mainNodeId === null) return;
    lines = lines.map((line) => {
      if (line.requestId !== input.requestId) return line;
      return {
        ...line,
        reactions: applyMessageReaction({
          reactions: line.reactions,
          kind: input.kind,
          playerId: mainNodeId,
          action: input.action,
        }),
      };
    });
    renderAll(false);
    await fetch(`${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: WORLD_CHAT_REACT_OP,
        payload: {
          requestId: input.requestId,
          mainNodeId,
          fromPlayerId: mainNodeId,
          kind: input.kind,
          action: input.action,
        },
      }),
    });
  };

  const lineElement = (line: GlobalChatLine): HTMLElement => {
    const row = document.createElement("article");
    row.className = "preview-global-chat-room__line";
    row.dataset.requestId = line.requestId;
    row.id = `world-msg-${line.requestId}`;
    if (line.depth === 1) {
      row.classList.add("preview-global-chat-room__line--depth-1");
    }
    if (line.depth === 2) {
      row.classList.add("preview-global-chat-room__line--depth-2");
    }
    const selfId = options.getMainNodeId();
    if (selfId !== null && line.fromPlayerId === selfId) {
      row.classList.add("preview-global-chat-room__line--self");
    }
    const meta = document.createElement("span");
    meta.className = "preview-global-chat-room__meta";
    meta.textContent = `${line.senderName} · ${toTimestampLabel(line.ts)}`;
    row.append(meta);
    if (line.parentRequestId !== null) {
      const parent = lines.find((item) => item.requestId === line.parentRequestId);
      const replyRef = document.createElement("span");
      replyRef.className = "preview-global-chat-room__reply-ref";
      replyRef.textContent = parent
        ? `↩ ${parent.senderName}: ${parent.message.slice(0, 64)}`
        : "↩ reply";
      row.append(replyRef);
    }
    const body = document.createElement("div");
    body.className = "preview-global-chat-room__message";
    if (line.messageKind === "audio") {
      const text = document.createElement("div");
      text.textContent = line.message;
      body.append(text);
      const audio = document.createElement("audio");
      audio.controls = true;
      const sourceData = line.audio?.dataBase64;
      if (typeof sourceData === "string" && sourceData.length > 0) {
        const encoding = line.audio?.encoding ?? "mp3";
        audio.src = `data:audio/${encoding};base64,${sourceData}`;
      }
      body.append(audio);
    } else if (line.messageKind === "media") {
      const text = document.createElement("div");
      text.textContent = line.message;
      body.append(text);
      const url = line.media?.url;
      if (typeof url === "string" && url.length > 0) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = line.media?.title ?? url;
        body.append(anchor);
      }
    } else {
      body.textContent = line.message;
    }
    row.append(body);
    const actions = createChatMessageActions({
      reactions: line.reactions,
      playerId: options.getMainNodeId(),
      canReply: canReplyToDepth(line.depth),
      onReply: () => {
        composer.setReplyTarget({
          requestId: line.requestId,
          previewText: line.message,
        });
      },
      onCopyLink: () => {
        void copyMessageLink(line.requestId);
      },
      onReact: ({ kind, action }) => {
        void reactToMessage({ requestId: line.requestId, kind, action });
      },
    });
    row.append(actions.element);
    return row;
  };

  const renderAll = (stickToBottom: boolean): void => {
    const previousTop = list.scrollTop;
    const previousHeight = list.scrollHeight;
    const nearBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight < 48;
    const ordered = sortThreadedMessages(lines);
    list.replaceChildren(...ordered.map(lineElement));
    if (stickToBottom || nearBottom) {
      list.scrollTop = list.scrollHeight;
    } else {
      list.scrollTop = list.scrollHeight - previousHeight + previousTop;
    }
    renderCount();
    renderP2aPanel();
  };

  const updateKnownIds = (): void => {
    knownRequestIds = new Set(lines.map((line) => line.requestId));
  };

  const resolveDepthForParent = (
    parentRequestId: string | null
  ): ReplyDepth => {
    if (parentRequestId === null) return 0;
    const parent = lines.find((line) => line.requestId === parentRequestId);
    if (parent === undefined) return 1;
    return parent.depth >= 1 ? 2 : 1;
  };

  const appendSingleLine = (line: GlobalChatLine): void => {
    if (line.messageKind === "text" && trimToNonEmpty(line.message).length === 0) {
      return;
    }
    if (knownRequestIds.has(line.requestId)) {
      lines = lines.map((existing) =>
        existing.requestId === line.requestId
          ? {
              ...existing,
              ...line,
              reactions: line.reactions,
            }
          : existing
      );
      renderAll(false);
      return;
    }
    lines = [...lines, line];
    knownRequestIds.add(line.requestId);
    if (lines.length > MAX_GLOBAL_LINES) {
      lines = lines.slice(lines.length - MAX_GLOBAL_LINES);
      updateKnownIds();
      renderAll(true);
      return;
    }
    if (line.parentRequestId !== null) {
      renderAll(true);
      return;
    }
    list.append(lineElement(line));
    list.scrollTop = list.scrollHeight;
  };

  const normalizeHistoryRows = (
    rows: WorldChatHistoryResponse["messages"]
  ): GlobalChatLine[] =>
    rows
      .map((row) => ({
        seq: row.seq,
        requestId: row.requestId,
        fromPlayerId: row.fromPlayerId,
        senderName: options.resolveSenderName(row.fromPlayerId),
        message: row.message,
        messageKind: "text" as const,
        ts: row.ts,
        parentRequestId: row.parentRequestId ?? null,
        depth: toReplyDepth(row.depth),
        reactions: normalizeMessageReactions(row.reactions),
      }))
      .sort((a, b) => a.seq - b.seq);

  const loadHistory = async (beforeSeq?: number): Promise<void> => {
    const sid = options.getSid();
    if (sid === null) return;
    const response = await fetch(`${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: WORLD_CHAT_HISTORY_OP,
        payload: {
          limit: INITIAL_PAGE_SIZE,
          ...(beforeSeq !== undefined ? { beforeSeq } : {}),
        },
      }),
    });
    if (!response.ok) {
      return;
    }
    const body = (await response.json()) as WorldChatHistoryResponse;
    const page = normalizeHistoryRows(body.messages).filter(
      (row) => !knownRequestIds.has(row.requestId)
    );
    if (beforeSeq === undefined) {
      const pageIds = new Set(page.map((line) => line.requestId));
      const existing = lines.filter((line) => !pageIds.has(line.requestId));
      lines = [...page, ...existing];
      updateKnownIds();
      renderAll(true);
    } else if (page.length > 0) {
      lines = [...page, ...lines];
      updateKnownIds();
      renderAll(false);
    }
    totalCount = body.totalCount;
    hasMore = body.hasMore;
    renderCount();
  };

  const loadInitialHistory = async (): Promise<void> => {
    if (loadingInitial) return;
    loadingInitial = true;
    try {
      await loadHistory();
      const deepLinked = parseMessageDeepLink(window.location.href);
      if (deepLinked !== null) {
        focusMessage(deepLinked);
      }
    } finally {
      loadingInitial = false;
    }
  };

  const loadOlderHistory = async (): Promise<void> => {
    if (loadingOlder || !hasMore) return;
    const beforeSeq = lines.length > 0 ? lines[0]?.seq : undefined;
    if (beforeSeq === undefined || beforeSeq <= 0) return;
    loadingOlder = true;
    try {
      await loadHistory(beforeSeq);
    } finally {
      loadingOlder = false;
    }
  };

  const sendMessage = async (
    message: string,
    parentRequestId: string | null
  ): Promise<void> => {
    if (message.length === 0) return;
    const sid = options.getSid();
    const mainNodeId = options.getMainNodeId();
    if (sid === null || mainNodeId === null) return;
    if (parentRequestId !== null) {
      const parent = lines.find((line) => line.requestId === parentRequestId);
      if (parent === undefined || !canReplyToDepth(parent.depth)) {
        return;
      }
    }
    reportPresentationEvent("WorldMessageAction");
    const requestId = crypto.randomUUID();
    appendSingleLine({
      seq: Number.MAX_SAFE_INTEGER,
      requestId,
      fromPlayerId: mainNodeId,
      senderName: options.resolveSenderName(mainNodeId),
      message,
      messageKind: "text",
      ts: new Date().toISOString(),
      parentRequestId,
      depth: resolveDepthForParent(parentRequestId),
      reactions: createEmptyMessageReactions(),
    });
    totalCount = Math.max(totalCount + 1, lines.length);
    renderCount();
    await fetch(`${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: WORLD_CHAT_PUBLISH_OP,
        payload: {
          requestId,
          mainNodeId,
          fromPlayerId: mainNodeId,
          message,
          ...(parentRequestId !== null ? { parentRequestId } : {}),
        },
      }),
    });
  };

  list.addEventListener("scroll", () => {
    if (list.scrollTop <= 24) {
      void loadOlderHistory();
    }
  });
  p2aToggle.addEventListener("change", () => {
    options.setP2aEnabled(p2aToggle.checked);
    if (p2aToggle.checked) {
      options.ensureIntercomAddress();
    }
    renderP2aPanel();
  });
  addressCopy.addEventListener("click", () => {
    const address = options.getIntercomAddress();
    if (address === null) return;
    void navigator.clipboard?.writeText(address);
  });
  addressShare.addEventListener("click", () => {
    const address = options.getIntercomAddress();
    if (address === null) return;
    if (typeof navigator.share === "function") {
      void navigator.share({ text: address });
      return;
    }
    void navigator.clipboard?.writeText(address);
  });
  window.addEventListener("resize", () => {
    const enabled = isLargeScreenForPanelResize(window.innerWidth);
    const handle = root.querySelector(
      ".chat-panel-resize__handle"
    ) as HTMLButtonElement | null;
    if (handle !== null) {
      handle.hidden = !enabled;
    }
  });

  void loadInitialHistory();
  renderP2aPanel();

  return {
    element: root,
    appendFromIntercomEvent: (event) => {
      const messageKind = event.messageKind ?? "text";
      const message = trimToNonEmpty(event.message ?? "");
      const fallbackMessage =
        messageKind === "media" && event.media !== undefined
          ? `Media: ${event.media.url}`
          : messageKind === "audio"
            ? "Audio message received."
            : message;
      if (messageKind === "text" && fallbackMessage.length === 0) return;
      if (typeof event.totalCount === "number" && event.totalCount >= 0) {
        totalCount = event.totalCount;
      }
      if (event.reactionUpdate === true && knownRequestIds.has(event.requestId)) {
        lines = lines.map((line) =>
          line.requestId === event.requestId
            ? {
                ...line,
                reactions: normalizeMessageReactions(event.reactions),
              }
            : line
        );
        renderAll(false);
        renderCount();
        return;
      }
      appendSingleLine({
        seq: typeof event.seq === "number" ? event.seq : Number.MAX_SAFE_INTEGER,
        requestId: event.requestId,
        fromPlayerId: event.fromPlayerId,
        senderName: options.resolveSenderName(event.fromPlayerId),
        message: fallbackMessage,
        messageKind,
        audio: event.audio,
        media: event.media,
        ts: event.ts,
        parentRequestId: event.parentRequestId ?? null,
        depth: toReplyDepth(event.depth),
        reactions: normalizeMessageReactions(event.reactions),
      });
      renderCount();
    },
    getLines: () => lines,
    refreshP2a: () => {
      renderP2aPanel();
    },
    focusMessage,
  };
}
