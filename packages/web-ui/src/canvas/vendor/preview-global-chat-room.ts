const STYLE_ID = "agent-play-preview-global-chat-room-styles";
const INITIAL_PAGE_SIZE = 100;
const MAX_GLOBAL_LINES = 5000;
const WORLD_CHAT_PUBLISH_OP = "worldChatPublish";
const WORLD_CHAT_HISTORY_OP = "worldChatHistory";

export type GlobalChatLine = {
  seq: number;
  requestId: string;
  fromPlayerId: string;
  senderName: string;
  message: string;
  ts: string;
};

type WorldChatHistoryResponse = {
  messages: Array<{
    seq: number;
    requestId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
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
  max-height: min(70vh, 560px);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.9));
}
.preview-global-chat-room__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.preview-global-chat-room__title {
  margin: 0;
  font-size: 12px;
  color: #f8fafc;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-family: "Press Start 2P", ui-monospace, monospace;
}
.preview-global-chat-room__count {
  font-size: 10px;
  color: #fde68a;
  font-family: "Press Start 2P", ui-monospace, monospace;
}
.preview-global-chat-room__list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 6px;
  padding-right: 4px;
}
.preview-global-chat-room__line {
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
}
.preview-global-chat-room__line--self {
  border-color: rgba(74, 222, 128, 0.45);
  background: rgba(20, 83, 45, 0.42);
}
.preview-global-chat-room__meta {
  display: block;
  font-size: 10px;
  color: #bae6fd;
  margin-bottom: 4px;
  font-family: "Press Start 2P", ui-monospace, monospace;
}
.preview-global-chat-room__message {
  font-size: 13px;
  color: #f8fafc;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}
.preview-global-chat-room__composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
}
.preview-global-chat-room__input {
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
  padding: 8px;
}
.preview-global-chat-room__send {
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.65);
  background: linear-gradient(180deg, #1d4ed8, #2563eb);
  color: #eff6ff;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 12px;
  font-family: "Press Start 2P", ui-monospace, monospace;
  font-size: 10px;
}
`;
  document.head.append(style);
}

function trimToNonEmpty(value: string): string {
  return value.trim();
}

function toTimestampLabel(ts: string): string {
  const date = new Date(ts);
  return Number.isNaN(date.valueOf()) ? ts : date.toLocaleTimeString();
}

export function createPreviewGlobalChatRoom(options: {
  apiBase: string;
  getSid: () => string | null;
  getMainNodeId: () => string | null;
  resolveSenderName: (fromPlayerId: string) => string;
}): {
  element: HTMLElement;
  appendFromIntercomEvent: (input: {
    seq?: number;
    requestId: string;
    fromPlayerId: string;
    message?: string;
    ts: string;
    totalCount?: number;
  }) => void;
  getLines: () => readonly GlobalChatLine[];
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
  titleRow.append(title, count);
  const list = document.createElement("div");
  list.className = "preview-global-chat-room__list";
  const composer = document.createElement("div");
  composer.className = "preview-global-chat-room__composer";
  const input = document.createElement("input");
  input.className = "preview-global-chat-room__input";
  input.placeholder = "Say something to everyone...";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "preview-global-chat-room__send";
  send.textContent = "Send";
  composer.append(input, send);
  root.append(titleRow, list, composer);

  let lines: GlobalChatLine[] = [];
  let knownRequestIds = new Set<string>();
  let totalCount = 0;
  let hasMore = false;
  let loadingOlder = false;
  let loadingInitial = false;

  const renderCount = (): void => {
    count.textContent = formatCompactCount(totalCount);
  };

  const lineElement = (line: GlobalChatLine): HTMLElement => {
    const row = document.createElement("article");
    row.className = "preview-global-chat-room__line";
    const selfId = options.getMainNodeId();
    if (selfId !== null && line.fromPlayerId === selfId) {
      row.classList.add("preview-global-chat-room__line--self");
    }
    const meta = document.createElement("span");
    meta.className = "preview-global-chat-room__meta";
    meta.textContent = `${line.senderName} · ${toTimestampLabel(line.ts)}`;
    const body = document.createElement("div");
    body.className = "preview-global-chat-room__message";
    body.textContent = line.message;
    row.append(meta, body);
    return row;
  };

  const renderAll = (): void => {
    list.replaceChildren(...lines.map(lineElement));
    list.scrollTop = list.scrollHeight;
    renderCount();
  };

  const updateKnownIds = (): void => {
    knownRequestIds = new Set(lines.map((line) => line.requestId));
  };

  const appendSingleLine = (line: GlobalChatLine): void => {
    if (knownRequestIds.has(line.requestId)) return;
    lines = [...lines, line];
    knownRequestIds.add(line.requestId);
    if (lines.length > MAX_GLOBAL_LINES) {
      lines = lines.slice(lines.length - MAX_GLOBAL_LINES);
      updateKnownIds();
      renderAll();
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
        ts: row.ts,
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
      renderAll();
    } else if (page.length > 0) {
      const prevHeight = list.scrollHeight;
      const prevTop = list.scrollTop;
      lines = [...page, ...lines];
      updateKnownIds();
      list.replaceChildren(...lines.map(lineElement));
      list.scrollTop = list.scrollHeight - prevHeight + prevTop;
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

  const sendMessage = async (): Promise<void> => {
    const message = trimToNonEmpty(input.value);
    if (message.length === 0) return;
    const sid = options.getSid();
    const mainNodeId = options.getMainNodeId();
    if (sid === null || mainNodeId === null) return;
    const requestId = crypto.randomUUID();
    appendSingleLine({
      seq: Number.MAX_SAFE_INTEGER,
      requestId,
      fromPlayerId: mainNodeId,
      senderName: options.resolveSenderName(mainNodeId),
      message,
      ts: new Date().toISOString(),
    });
    totalCount = Math.max(totalCount + 1, lines.length);
    renderCount();
    input.value = "";
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
        },
      }),
    });
  };

  list.addEventListener("scroll", () => {
    if (list.scrollTop <= 24) {
      void loadOlderHistory();
    }
  });
  send.addEventListener("click", () => {
    void sendMessage();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  });

  void loadInitialHistory();

  return {
    element: root,
    appendFromIntercomEvent: (event) => {
      const message = trimToNonEmpty(event.message ?? "");
      if (message.length === 0) return;
      if (typeof event.totalCount === "number" && event.totalCount >= 0) {
        totalCount = event.totalCount;
      }
      appendSingleLine({
        seq: typeof event.seq === "number" ? event.seq : Number.MAX_SAFE_INTEGER,
        requestId: event.requestId,
        fromPlayerId: event.fromPlayerId,
        senderName: options.resolveSenderName(event.fromPlayerId),
        message,
        ts: event.ts,
      });
      renderCount();
    },
    getLines: () => lines,
  };
}
