import {
  INTERCOM_COMMAND_OP,
  parseWorldIntercomEventPayload,
  type WorldIntercomEventPayload,
} from "@agent-play/intercom";
import { appendChatLogLine, getChatLogLinesForAgent } from "./preview-chat-log.js";
import type { AssistToolDef } from "./preview-assist-ui.js";
import {
  formatCredentialCreatedAt,
  readHumanCredentials,
} from "./preview-human-credentials.js";
import { logSessionInteraction } from "./preview-session-interaction-log.js";
import {
  buildAssistArgsFromInputs,
  resolveAssistFieldType,
} from "./preview-assist-coerce.js";

const STYLE_ID = "agent-play-preview-session-interaction-styles";

type Mode = "assist" | "chat";

export type SessionInteractionAgent = {
  agentId: string;
  name: string;
  assistTools?: readonly AssistToolDef[];
};

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.preview-session-interaction {
  flex: 1 1 auto;
  min-height: 0;
  box-sizing: border-box;
  padding: 12px;
  padding-bottom: max(20px, calc(12px + env(safe-area-inset-bottom, 0px)));
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.86);
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.preview-session-interaction__title { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
.preview-session-interaction__target { font-size: 12px; color: #cbd5e1; margin-bottom: 8px; }
.preview-session-interaction__modes { display: flex; gap: 8px; margin-bottom: 8px; }
.preview-session-interaction__mode-btn {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(30, 41, 59, 0.95);
  color: #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
}
.preview-session-interaction__mode-btn[data-active="1"] {
  border-color: rgba(96, 165, 250, 0.65);
  background: rgba(30, 58, 138, 0.48);
}
.preview-session-interaction__assist-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.preview-session-interaction__assist-tool-btn {
  border: 1px solid rgba(96, 165, 250, 0.45);
  background: rgba(219, 234, 254, 0.2);
  color: #dbeafe;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
}
.preview-session-interaction__assist-desc { font-size: 11px; color: #bfdbfe; margin-bottom: 8px; }
.preview-session-interaction__assist-form { display: grid; gap: 6px; }
.preview-session-interaction__assist-form label { font-size: 11px; color: #cbd5e1; }
.preview-session-interaction__assist-form input:not([type="checkbox"]),
.preview-session-interaction__chat-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 6px;
  padding: 8px;
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
}
.preview-session-interaction__assist-form input[type="checkbox"] {
  width: auto;
  margin-left: 8px;
  vertical-align: middle;
}
.preview-session-interaction__send-btn {
  justify-self: end;
  border: 1px solid rgba(59, 130, 246, 0.65);
  background: rgba(37, 99, 235, 0.82);
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
.preview-session-interaction__progress {
  display: none;
  height: 4px;
  border-radius: 3px;
  margin: 8px 0;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.3);
}
.preview-session-interaction__progress[data-on="1"] { display: block; }
.preview-session-interaction__progress > div {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #3b82f6, #93c5fd, #3b82f6);
  background-size: 200% 100%;
  animation: preview-session-interaction-marquee 1.1s linear infinite;
}
@keyframes preview-session-interaction-marquee {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.preview-session-interaction__chat-log {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}
.preview-session-interaction__bubble {
  max-width: 92%;
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.35;
  border: 1px solid rgba(148, 163, 184, 0.4);
}
.preview-session-interaction__bubble--left {
  justify-self: start;
  background: rgba(30, 64, 175, 0.45);
}
.preview-session-interaction__bubble--right {
  justify-self: end;
  background: rgba(5, 150, 105, 0.3);
}
.preview-session-interaction__chat-compose {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
}
.preview-session-interaction__empty { font-size: 11px; color: #94a3b8; }
.preview-session-interaction__reply-loading {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(96, 165, 250, 0.4);
  background: rgba(30, 58, 138, 0.35);
  color: #bfdbfe;
  font-size: 12px;
  line-height: 1.4;
}
.preview-session-interaction__result {
  margin-top: 8px;
  font-size: 11px;
  color: #86efac;
  white-space: pre-wrap;
}
.preview-session-interaction__assist-result {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}
.preview-session-interaction__assist-html {
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
}
.preview-session-interaction__assist-html .assist-html-root h3,
.preview-session-interaction__assist-html .assist-html-root h2 {
  font-size: 13px;
  margin: 10px 0 6px;
  color: #f1f5f9;
}
.preview-session-interaction__assist-html .assist-html-root ul {
  margin: 6px 0 6px 1.1em;
  padding: 0;
}
.preview-session-interaction__assist-json {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.35);
  font-size: 10px;
  line-height: 1.35;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #cbd5e1;
}
.preview-session-interaction__assist-new-btn {
  justify-self: start;
}
.preview-session-interaction__error-panel {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.35);
  color: #fecaca;
  font-size: 12px;
  line-height: 1.4;
}
.preview-session-interaction__error-panel[hidden] {
  display: none !important;
}
.preview-session-interaction__error-headline {
  font-weight: 600;
  color: #fecaca;
}
.preview-session-interaction__error-dismiss {
  justify-self: start;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid rgba(248, 113, 113, 0.55);
  background: rgba(15, 23, 42, 0.5);
  color: #fecaca;
}
.preview-session-interaction__error-debug {
  font-size: 11px;
  color: #cbd5e1;
}
.preview-session-interaction__error-debug summary {
  cursor: pointer;
  color: #94a3b8;
  user-select: none;
}
.preview-session-interaction__error-pre {
  margin: 8px 0 0 0;
  padding: 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.85);
  color: #e2e8f0;
  font-size: 10px;
  line-height: 1.35;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.preview-session-interaction__node-info {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  gap: 8px;
}
.preview-session-interaction__node-info-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.preview-session-interaction__node-info-row {
  font-size: 11px;
  color: #cbd5e1;
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 8px;
  align-items: start;
  word-break: break-all;
}
.preview-session-interaction__node-info-label { color: #94a3b8; }
.preview-session-interaction__node-new-btn {
  justify-self: start;
  margin-top: 4px;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid rgba(59, 130, 246, 0.55);
  background: rgba(37, 99, 235, 0.35);
  color: #dbeafe;
}
.preview-session-interaction__node-new-btn--danger {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(127, 29, 29, 0.42);
  color: #fecaca;
}
.preview-session-interaction__danger-overlay {
  position: fixed;
  inset: 0;
  z-index: 12500;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.78);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.preview-session-interaction__danger-card {
  max-width: 400px;
  padding: 18px;
  border-radius: 10px;
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid rgba(248, 113, 113, 0.45);
  display: grid;
  gap: 10px;
}
.preview-session-interaction__danger-card h3 {
  margin: 0;
  font-size: 15px;
  color: #fecaca;
}
.preview-session-interaction__danger-card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #cbd5e1;
}
.preview-session-interaction__danger-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 4px;
}
.preview-session-interaction__danger-actions button {
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
}
.preview-session-interaction__danger-cancel {
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: transparent;
  color: #e2e8f0;
}
.preview-session-interaction__danger-confirm {
  border: 1px solid rgba(220, 38, 38, 0.65);
  background: rgba(185, 28, 28, 0.85);
  color: #fff;
}
`;
  document.head.append(s);
}

function openReplaceNodeDangerDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "preview-session-interaction__danger-overlay";
    const card = document.createElement("div");
    card.className = "preview-session-interaction__danger-card";
    const heading = document.createElement("h3");
    heading.textContent = "Create a new main node?";
    const copy = document.createElement("p");
    copy.textContent =
      "This will remove the current node credentials from this browser tab and start the setup flow again. You cannot undo this: the previous node id and passphrase will no longer be available here unless you saved credentials.json. Continue only if you understand the consequences.";
    const actions = document.createElement("div");
    actions.className = "preview-session-interaction__danger-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "preview-session-interaction__danger-cancel";
    cancelBtn.textContent = "Cancel";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "preview-session-interaction__danger-confirm";
    confirmBtn.textContent = "Yes, replace node";
    actions.append(cancelBtn, confirmBtn);
    card.append(heading, copy, actions);
    overlay.append(card);
    document.body.append(overlay);

    const finish = (ok: boolean): void => {
      overlay.remove();
      resolve(ok);
    };

    cancelBtn.addEventListener("click", () => {
      finish(false);
    });
    confirmBtn.addEventListener("click", () => {
      finish(true);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        finish(false);
      }
    });
  });
}

function titleFromToolName(toolName: string): string {
  const base = toolName.startsWith("assist_") ? toolName.slice(7) : toolName;
  return base
    .split("_")
    .filter((v) => v.length > 0)
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join(" ");
}

const DEFAULT_INTERCOM_REPLY_TIMEOUT_MS = 30_000;

function intercomEventMatchesHumanAgentReply(
  payload: WorldIntercomEventPayload,
  mainNodeId: string,
  activeAgentId: string
): boolean {
  return (
    payload.toPlayerId === mainNodeId && payload.fromPlayerId === activeAgentId
  );
}

function formatIntercomResultText(payload: WorldIntercomEventPayload): string {
  if (payload.status === "failed") {
    return payload.error ?? "failed";
  }
  if (payload.result !== undefined) {
    const r = payload.result;
    const m = r.message;
    if (typeof m === "string") {
      return m;
    }
    return JSON.stringify(r, null, 2);
  }
  if (payload.message !== undefined) {
    return payload.message;
  }
  return payload.status;
}

function escapeAssistPlainText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createPreviewSessionInteractionPanel(options: {
  getSid: () => string | null;
  apiBase: string;
  getMainNodeId: () => string | null;
  onHumanNodeLifecycle?: (action: "replace" | "setup") => void | Promise<void>;
}): {
  element: HTMLElement;
  setAgents: (agents: readonly SessionInteractionAgent[]) => void;
  setContext: (agentId: string) => void;
  setMode: (mode: Mode) => void;
  refresh: () => void;
  applyIntercomEvent: (raw: unknown) => void;
} {
  ensureStyles();
  const root = document.createElement("section");
  root.className = "preview-session-interaction";
  const title = document.createElement("div");
  title.className = "preview-session-interaction__title";
  title.textContent = "Human Agent Interaction";

  const nodeInfo = document.createElement("div");
  nodeInfo.className = "preview-session-interaction__node-info";
  const nodeSectionTitle = document.createElement("div");
  nodeSectionTitle.className = "preview-session-interaction__node-info-title";
  nodeSectionTitle.textContent = "Node information";
  const nodeIdRow = document.createElement("div");
  nodeIdRow.className = "preview-session-interaction__node-info-row";
  const nodeIdLabel = document.createElement("span");
  nodeIdLabel.className = "preview-session-interaction__node-info-label";
  nodeIdLabel.textContent = "Node id";
  const nodeIdValue = document.createElement("span");
  nodeIdRow.append(nodeIdLabel, nodeIdValue);
  const nodeCreatedRow = document.createElement("div");
  nodeCreatedRow.className = "preview-session-interaction__node-info-row";
  const nodeCreatedLabel = document.createElement("span");
  nodeCreatedLabel.className = "preview-session-interaction__node-info-label";
  nodeCreatedLabel.textContent = "Created";
  const nodeCreatedValue = document.createElement("span");
  nodeCreatedRow.append(nodeCreatedLabel, nodeCreatedValue);
  const nodeActionBtn = document.createElement("button");
  nodeActionBtn.type = "button";
  nodeActionBtn.dataset.nodeUi = "1";
  nodeActionBtn.className = "preview-session-interaction__node-new-btn";
  nodeInfo.append(
    nodeSectionTitle,
    nodeIdRow,
    nodeCreatedRow,
    nodeActionBtn
  );

  const renderNodeInfo = (): void => {
    const creds = readHumanCredentials();
    if (creds === null) {
      nodeIdValue.textContent = "—";
      nodeCreatedValue.textContent = "—";
      nodeActionBtn.textContent = "Set up main node";
      nodeActionBtn.classList.remove(
        "preview-session-interaction__node-new-btn--danger"
      );
      return;
    }
    nodeIdValue.textContent = creds.nodeId;
    nodeCreatedValue.textContent = formatCredentialCreatedAt(creds.createdAtIso);
    nodeActionBtn.textContent = "Create new node";
    nodeActionBtn.classList.add(
      "preview-session-interaction__node-new-btn--danger"
    );
  };

  nodeActionBtn.addEventListener("click", () => {
    void (async () => {
      const creds = readHumanCredentials();
      if (creds === null) {
        await options.onHumanNodeLifecycle?.("setup");
        renderNodeInfo();
        return;
      }
      const ok = await openReplaceNodeDangerDialog();
      if (!ok) {
        return;
      }
      await options.onHumanNodeLifecycle?.("replace");
      renderNodeInfo();
    })();
  });

  const target = document.createElement("div");
  target.className = "preview-session-interaction__target";
  target.textContent = "Target: (none)";
  const modes = document.createElement("div");
  modes.className = "preview-session-interaction__modes";
  const assistBtn = document.createElement("button");
  assistBtn.type = "button";
  assistBtn.className = "preview-session-interaction__mode-btn";
  assistBtn.textContent = "Assist Action";
  const chatBtn = document.createElement("button");
  chatBtn.type = "button";
  chatBtn.className = "preview-session-interaction__mode-btn";
  chatBtn.textContent = "Chat Action";
  modes.append(assistBtn, chatBtn);

  const progress = document.createElement("div");
  progress.className = "preview-session-interaction__progress";
  progress.append(document.createElement("div"));

  const body = document.createElement("div");
  const errorPanel = document.createElement("div");
  errorPanel.className = "preview-session-interaction__error-panel";
  errorPanel.hidden = true;
  const errorHeadline = document.createElement("div");
  errorHeadline.className = "preview-session-interaction__error-headline";
  const errorDismiss = document.createElement("button");
  errorDismiss.type = "button";
  errorDismiss.dataset.sessionErrorDismiss = "1";
  errorDismiss.className = "preview-session-interaction__error-dismiss";
  errorDismiss.textContent = "Dismiss";
  const errorDebug = document.createElement("details");
  errorDebug.className = "preview-session-interaction__error-debug";
  const errorDebugSummary = document.createElement("summary");
  errorDebugSummary.textContent = "Technical details";
  const errorPre = document.createElement("pre");
  errorPre.className = "preview-session-interaction__error-pre";
  errorDebug.append(errorDebugSummary, errorPre);
  errorPanel.append(errorHeadline, errorDismiss, errorDebug);
  const result = document.createElement("div");
  result.className = "preview-session-interaction__result";
  root.append(title, nodeInfo, target, modes, progress, body, errorPanel, result);

  let mode: Mode = "assist";
  let activeAgentId: string | null = null;
  let busy = false;
  let selectedTool: AssistToolDef | null = null;
  let assistResultView: {
    title: string;
    html: string;
    json: string;
  } | null = null;
  let agentsById = new Map<string, SessionInteractionAgent>();
  const pendingByRequestId = new Map<
    string,
    { mode: Mode; agentId: string; toolName?: string }
  >();

  type ReplyWaitState = {
    requestId: string;
    mode: Mode;
    agentId: string;
    mainNodeId: string;
    timeoutId: ReturnType<typeof setTimeout>;
  };
  let replyWait: ReplyWaitState | null = null;

  const clearReplyWaitState = (): void => {
    if (replyWait === null) {
      return;
    }
    clearTimeout(replyWait.timeoutId);
    replyWait = null;
  };

  const startReplyWait = (o: {
    requestId: string;
    mode: Mode;
    agentId: string;
    mainNodeId: string;
  }): void => {
    clearReplyWaitState();
    const timeoutId = setTimeout(() => {
      if (replyWait === null || replyWait.requestId !== o.requestId) {
        return;
      }
      const rid = replyWait.requestId;
      clearReplyWaitState();
      pendingByRequestId.delete(rid);
      setBusy(false);
      setInteractionError("Sorry — request timed out.", {
        step: "intercom:reply_timeout",
        reason: "timeout_ms",
        timeoutMs: DEFAULT_INTERCOM_REPLY_TIMEOUT_MS,
        requestId: rid,
      });
      result.textContent = "Sorry, failed: timeout.";
      render();
    }, DEFAULT_INTERCOM_REPLY_TIMEOUT_MS);
    replyWait = { ...o, timeoutId };
  };

  const createReplyLoadingEl = (): HTMLDivElement => {
    const el = document.createElement("div");
    el.className = "preview-session-interaction__reply-loading";
    el.setAttribute("role", "status");
    el.textContent = "Waiting for response…";
    return el;
  };

  type InteractionErrorState = {
    headline: string;
    technical: Record<string, unknown>;
  };
  let interactionError: InteractionErrorState | null = null;

  const syncErrorPanel = (): void => {
    if (interactionError === null) {
      errorPanel.hidden = true;
      errorHeadline.textContent = "";
      errorPre.textContent = "";
      return;
    }
    errorPanel.hidden = false;
    errorHeadline.textContent = interactionError.headline;
    errorPre.textContent = JSON.stringify(interactionError.technical, null, 2);
  };

  const setInteractionError = (
    headline: string,
    technical: Record<string, unknown>
  ): void => {
    interactionError = { headline, technical };
    syncErrorPanel();
  };

  const clearInteractionError = (): void => {
    interactionError = null;
    syncErrorPanel();
  };

  errorDismiss.addEventListener("click", () => {
    logSessionInteraction("errorPanel:dismiss", "event", {});
    clearInteractionError();
  });

  const setBusy = (next: boolean): void => {
    busy = next;
    progress.setAttribute("data-on", busy ? "1" : "0");
    root
      .querySelectorAll(
        "button:not([data-node-ui]):not([data-session-error-dismiss]),input"
      )
      .forEach((el) => {
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
        el.disabled = busy;
      }
    });
  };

  const applyModeButtons = (): void => {
    assistBtn.setAttribute("data-active", mode === "assist" ? "1" : "0");
    chatBtn.setAttribute("data-active", mode === "chat" ? "1" : "0");
  };

  const renderChat = (): void => {
    body.replaceChildren();
    if (activeAgentId === null) {
      const empty = document.createElement("div");
      empty.className = "preview-session-interaction__empty";
      empty.textContent = "Move near an occupant and press A or C.";
      body.append(empty);
      return;
    }
    const log = document.createElement("div");
    log.className = "preview-session-interaction__chat-log";
    for (const line of getChatLogLinesForAgent(activeAgentId)) {
      const bubble = document.createElement("div");
      const isUser = line.role === "user";
      bubble.className = `preview-session-interaction__bubble ${isUser ? "preview-session-interaction__bubble--left" : "preview-session-interaction__bubble--right"}`;
      bubble.textContent = line.text;
      log.append(bubble);
    }
    if (
      replyWait !== null &&
      replyWait.mode === "chat" &&
      replyWait.agentId === activeAgentId
    ) {
      body.append(log, createReplyLoadingEl());
      return;
    }
    const compose = document.createElement("form");
    compose.className = "preview-session-interaction__chat-compose";
    const input = document.createElement("input");
    input.className = "preview-session-interaction__chat-input";
    input.placeholder = "Type a message...";
    input.autocomplete = "off";
    const send = document.createElement("button");
    send.type = "submit";
    send.className = "preview-session-interaction__send-btn";
    send.textContent = "Send";
    compose.append(input, send);
    compose.addEventListener("submit", (e) => {
      e.preventDefault();
      logSessionInteraction("chat:submit:precheck", "start", {
        activeAgentId,
        textLength: input.value.trim().length,
      });
      if (activeAgentId === null) {
        logSessionInteraction("chat:submit", "skip", {
          reason: "active_agent_missing",
        });
        setInteractionError("Cannot send: no agent is selected as the chat target.", {
          step: "chat:submit",
          reason: "activeAgentId_null",
          mode: "chat",
        });
        return;
      }
      const text = input.value.trim();
      if (text.length === 0) {
        logSessionInteraction("chat:submit", "skip", {
          reason: "empty_message",
          agentId: activeAgentId,
        });
        return;
      }
      const sid = options.getSid();
      if (sid === null) {
        logSessionInteraction("chat:submit", "skip", {
          reason: "sid_missing",
          agentId: activeAgentId,
        });
        setInteractionError(
          "Cannot send: session id is missing. Reload the page or open the preview URL with a valid sid.",
          {
            step: "chat:submit",
            reason: "sid_null",
            apiBase: options.apiBase,
          }
        );
        return;
      }
      const mainNodeId = options.getMainNodeId();
      if (mainNodeId === null) {
        logSessionInteraction("chat:submit", "skip", {
          reason: "main_node_id_missing",
          agentId: activeAgentId,
          sid,
        });
        setInteractionError(
          "Cannot send: main node id is missing. Complete human onboarding in this browser.",
          {
            step: "chat:submit",
            reason: "mainNodeId_null",
            sid,
          }
        );
        result.textContent = "";
        return;
      }
      clearInteractionError();
      const requestId = crypto.randomUUID();
      const rpcUrl = `${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`;
      logSessionInteraction("chat:submit:request", "start", {
        requestId,
        toPlayerId: activeAgentId,
        rpcUrl,
      });
      pendingByRequestId.set(requestId, { mode: "chat", agentId: activeAgentId });
      appendChatLogLine({
        agentId: activeAgentId,
        playerName: "You",
        role: "user",
        text,
      });
      input.value = "";
      startReplyWait({
        requestId,
        mode: "chat",
        agentId: activeAgentId,
        mainNodeId,
      });
      setBusy(true);
      result.textContent = `${requestId}: pending`;
      render();
      void fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: INTERCOM_COMMAND_OP,
          payload: {
            requestId,
            mainNodeId,
            fromPlayerId: mainNodeId,
            toPlayerId: activeAgentId,
            kind: "chat",
            text,
          },
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const bodyText = await res.text();
            logSessionInteraction("chat:submit", "error", {
              requestId,
              httpStatus: res.status,
              bodyPreview: bodyText.slice(0, 500),
            });
            throw new Error(bodyText);
          }
          logSessionInteraction("chat:submit", "success", {
            requestId,
            httpStatus: res.status,
          });
        })
        .catch((err: unknown) => {
          const m = err instanceof Error ? err.message : String(err);
          logSessionInteraction("chat:submit", "error", {
            requestId,
            message: m,
          });
          clearReplyWaitState();
          result.textContent = m;
          setInteractionError("Chat request failed.", {
            step: "chat:fetch",
            requestId,
            message: m,
            rpcUrl,
          });
          pendingByRequestId.delete(requestId);
          setBusy(false);
          render();
        });
    });
    body.append(log, compose);
  };

  const renderAssist = (): void => {
    body.replaceChildren();
    if (activeAgentId === null) {
      const empty = document.createElement("div");
      empty.className = "preview-session-interaction__empty";
      empty.textContent = "Move near an occupant and press A.";
      body.append(empty);
      return;
    }
    const occ = agentsById.get(activeAgentId);
    const tools = occ?.assistTools ?? [];
    const toolBar = document.createElement("div");
    toolBar.className = "preview-session-interaction__assist-tools";
    for (const tool of tools) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preview-session-interaction__assist-tool-btn";
      btn.textContent = titleFromToolName(tool.name);
      btn.addEventListener("click", () => {
        selectedTool = tool;
        assistResultView = null;
        result.textContent = "";
        renderAssist();
      });
      toolBar.append(btn);
    }
    body.append(toolBar);
    if (assistResultView !== null) {
      const wrap = document.createElement("div");
      wrap.className = "preview-session-interaction__assist-result";
      const resTitle = document.createElement("div");
      resTitle.className = "preview-session-interaction__title";
      resTitle.textContent = assistResultView.title;
      const htmlBox = document.createElement("div");
      htmlBox.className = "preview-session-interaction__assist-html";
      htmlBox.innerHTML = assistResultView.html;
      const jsonPre = document.createElement("pre");
      jsonPre.className = "preview-session-interaction__assist-json";
      jsonPre.textContent = assistResultView.json;
      const newBtn = document.createElement("button");
      newBtn.type = "button";
      newBtn.className =
        "preview-session-interaction__send-btn preview-session-interaction__assist-new-btn";
      newBtn.textContent = "New assist";
      newBtn.addEventListener("click", () => {
        assistResultView = null;
        selectedTool = null;
        result.textContent = "";
        render();
      });
      wrap.append(resTitle, htmlBox, jsonPre, newBtn);
      body.append(wrap);
      result.textContent = "";
      return;
    }
    if (
      replyWait !== null &&
      replyWait.mode === "assist" &&
      replyWait.agentId === activeAgentId
    ) {
      if (selectedTool !== null) {
        const headingWait = document.createElement("div");
        headingWait.className = "preview-session-interaction__title";
        headingWait.textContent = titleFromToolName(selectedTool.name);
        const descWait = document.createElement("div");
        descWait.className = "preview-session-interaction__assist-desc";
        descWait.textContent = selectedTool.description || selectedTool.name;
        body.append(headingWait, descWait, createReplyLoadingEl());
      } else {
        body.append(createReplyLoadingEl());
      }
      return;
    }
    if (selectedTool === null) {
      result.textContent = "";
      const empty = document.createElement("div");
      empty.className = "preview-session-interaction__empty";
      empty.textContent = "Choose an assist tool to begin.";
      body.append(empty);
      return;
    }
    const heading = document.createElement("div");
    heading.className = "preview-session-interaction__title";
    heading.textContent = titleFromToolName(selectedTool.name);
    const desc = document.createElement("div");
    desc.className = "preview-session-interaction__assist-desc";
    desc.textContent = selectedTool.description || selectedTool.name;
    const form = document.createElement("form");
    form.className = "preview-session-interaction__assist-form";
    const inputs = new Map<string, HTMLInputElement>();
    const paramKeys = Object.keys(selectedTool.parameters).filter(
      (k) => !k.startsWith("_")
    );
    for (const key of paramKeys) {
      const meta = selectedTool.parameters[key];
      const fieldType = resolveAssistFieldType(meta);
      const label = document.createElement("label");
      label.textContent = key;
      if (fieldType === "boolean") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = key;
        label.appendChild(input);
        form.append(label);
        inputs.set(key, input);
        continue;
      }
      const input = document.createElement("input");
      input.type = fieldType === "number" ? "number" : "text";
      if (fieldType === "number") {
        input.step = "any";
      }
      input.name = key;
      label.appendChild(input);
      form.append(label);
      inputs.set(key, input);
    }
    const send = document.createElement("button");
    send.className = "preview-session-interaction__send-btn";
    send.type = "submit";
    send.textContent = "Send";
    form.append(send);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      logSessionInteraction("assist:submit:precheck", "start", {
        activeAgentId,
        toolName: selectedTool?.name ?? null,
      });
      if (activeAgentId === null || selectedTool === null) {
        logSessionInteraction("assist:submit", "skip", {
          reason: "active_agent_or_tool_missing",
          hasAgent: activeAgentId !== null,
          hasTool: selectedTool !== null,
        });
        setInteractionError(
          "Cannot run assist: no agent or no tool is selected.",
          {
            step: "assist:submit",
            reason: "activeAgentId_or_selectedTool_null",
            hasAgent: activeAgentId !== null,
            hasTool: selectedTool !== null,
          }
        );
        return;
      }
      const sid = options.getSid();
      if (sid === null) {
        logSessionInteraction("assist:submit", "skip", {
          reason: "sid_missing",
          toolName: selectedTool.name,
        });
        setInteractionError(
          "Cannot send: session id is missing. Reload the page or open the preview URL with a valid sid.",
          {
            step: "assist:submit",
            reason: "sid_null",
            toolName: selectedTool.name,
            apiBase: options.apiBase,
          }
        );
        return;
      }
      const mainNodeId = options.getMainNodeId();
      if (mainNodeId === null) {
        logSessionInteraction("assist:submit", "skip", {
          reason: "main_node_id_missing",
          toolName: selectedTool.name,
          sid,
        });
        setInteractionError(
          "Cannot send: main node id is missing. Complete human onboarding in this browser.",
          {
            step: "assist:submit",
            reason: "mainNodeId_null",
            toolName: selectedTool.name,
            sid,
          }
        );
        result.textContent = "";
        return;
      }
      clearInteractionError();
      assistResultView = null;
      const assistTool = selectedTool;
      const args = buildAssistArgsFromInputs({
        parameters: assistTool.parameters,
        keys: paramKeys,
        getInput: (key) => inputs.get(key),
      });
      const requestId = crypto.randomUUID();
      const rpcUrl = `${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`;
      logSessionInteraction("assist:submit:request", "start", {
        requestId,
        toolName: assistTool.name,
        toPlayerId: activeAgentId,
        rpcUrl,
      });
      pendingByRequestId.set(requestId, {
        mode: "assist",
        agentId: activeAgentId,
        toolName: assistTool.name,
      });
      startReplyWait({
        requestId,
        mode: "assist",
        agentId: activeAgentId,
        mainNodeId,
      });
      setBusy(true);
      result.textContent = `${requestId}: pending`;
      render();
      void fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: INTERCOM_COMMAND_OP,
          payload: {
            requestId,
            mainNodeId,
            fromPlayerId: mainNodeId,
            toPlayerId: activeAgentId,
            kind: "assist",
            toolName: assistTool.name,
            args,
          },
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const bodyText = await res.text();
            logSessionInteraction("assist:submit", "error", {
              requestId,
              httpStatus: res.status,
              bodyPreview: bodyText.slice(0, 500),
            });
            throw new Error(bodyText);
          }
          logSessionInteraction("assist:submit", "success", {
            requestId,
            httpStatus: res.status,
          });
        })
        .catch((err: unknown) => {
          const m = err instanceof Error ? err.message : String(err);
          logSessionInteraction("assist:submit", "error", {
            requestId,
            message: m,
          });
          clearReplyWaitState();
          result.textContent = m;
          setInteractionError("Assist request failed.", {
            step: "assist:fetch",
            requestId,
            toolName: assistTool.name,
            message: m,
            rpcUrl,
          });
          pendingByRequestId.delete(requestId);
          setBusy(false);
          render();
        });
    });
    body.append(heading, desc, form);
  };

  const render = (): void => {
    renderNodeInfo();
    applyModeButtons();
    const display =
      activeAgentId === null
        ? "(none)"
        : (agentsById.get(activeAgentId)?.name ?? activeAgentId);
    target.textContent = `Target: ${display}`;
    if (mode === "assist") {
      renderAssist();
      return;
    }
    renderChat();
  };

  const applyIntercomEvent = (raw: unknown): void => {
    let payload: WorldIntercomEventPayload;
    try {
      payload = parseWorldIntercomEventPayload(raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logSessionInteraction("intercom:sse", "error", {
        reason: "parse_failed",
        message,
      });
      setInteractionError("Received an event that could not be parsed as intercom.", {
        step: "intercom:parse",
        reason: "parseWorldIntercomEventPayload_threw",
        message,
      });
      result.textContent = "Received non-intercom SSE payload.";
      return;
    }
    logSessionInteraction("intercom:sse", "event", {
      requestId: payload.requestId,
      status: payload.status,
    });
    const rid = payload.requestId;
    const pending = pendingByRequestId.get(rid);
    if (pending === undefined) {
      logSessionInteraction("intercom:sse", "skip", {
        reason: "request_not_pending",
        requestId: rid,
        status: payload.status,
      });
      result.textContent = [
        result.textContent,
        `[diagnostic] ${payload.status} ${rid}`,
      ]
        .filter((s) => s.length > 0)
        .join("\n");
      return;
    }
    const mn = options.getMainNodeId();
    if (mn === null) {
      logSessionInteraction("intercom:sse", "skip", {
        reason: "mainNodeId_null",
        requestId: rid,
        status: payload.status,
      });
      return;
    }
    if (!intercomEventMatchesHumanAgentReply(payload, mn, pending.agentId)) {
      logSessionInteraction("intercom:sse", "skip", {
        reason: "route_mismatch",
        requestId: rid,
        status: payload.status,
        toPlayerId: payload.toPlayerId,
        fromPlayerId: payload.fromPlayerId,
        expectedTo: mn,
        expectedFrom: pending.agentId,
      });
      return;
    }
    if (payload.status === "started" || payload.status === "forwarded") {
      result.textContent = `${rid}: ${payload.status}`;
      return;
    }
    if (payload.status === "stream") {
      result.textContent = `${rid}: ${formatIntercomResultText(payload)}`;
      return;
    }
    if (payload.status === "completed") {
      clearReplyWaitState();
      setBusy(false);
      clearInteractionError();
      if (pending.mode === "chat" && activeAgentId === pending.agentId) {
        appendChatLogLine({
          agentId: pending.agentId,
          playerName: "Agent",
          role: "assistant",
          text: formatIntercomResultText(payload),
        });
      } else if (pending.mode === "assist") {
        const r = payload.result ?? {};
        const fallbackText = formatIntercomResultText(payload);
        const html =
          typeof r.messageHtml === "string" && r.messageHtml.trim().length > 0
            ? r.messageHtml
            : `<div class="assist-html-root"><pre>${escapeAssistPlainText(fallbackText)}</pre></div>`;
        assistResultView = {
          title: titleFromToolName(pending.toolName ?? "assist"),
          html,
          json: JSON.stringify(r, null, 2),
        };
        result.textContent = "";
      } else {
        result.textContent = formatIntercomResultText(payload);
      }
      pendingByRequestId.delete(rid);
      render();
      return;
    }
    if (payload.status === "failed") {
      clearReplyWaitState();
      setBusy(false);
      const errText = payload.error ?? "failed";
      logSessionInteraction("intercom:sse", "error", {
        requestId: rid,
        status: "failed",
        error: errText,
      });
      result.textContent = `${rid}: ${errText}`;
      setInteractionError("Intercom reported failure for this request.", {
        step: "intercom:payload",
        requestId: rid,
        status: payload.status,
        error: errText,
        mode: pending.mode,
        agentId: pending.agentId,
      });
      pendingByRequestId.delete(rid);
      render();
    }
  };

  assistBtn.addEventListener("click", () => {
    mode = "assist";
    render();
  });
  chatBtn.addEventListener("click", () => {
    mode = "chat";
    render();
  });

  render();
  return {
    element: root,
    setAgents: (agents) => {
      agentsById = new Map(agents.map((a) => [a.agentId, a]));
      if (activeAgentId !== null && !agentsById.has(activeAgentId)) {
        activeAgentId = null;
      }
      if (selectedTool !== null) {
        const nextTools = activeAgentId === null ? [] : (agentsById.get(activeAgentId)?.assistTools ?? []);
        if (!nextTools.some((t) => t.name === selectedTool?.name)) {
          selectedTool = null;
          assistResultView = null;
        }
      }
      render();
    },
    setContext: (agentId) => {
      logSessionInteraction("panel:setContext", "event", {
        agentId,
      });
      if (replyWait !== null && replyWait.agentId !== agentId) {
        pendingByRequestId.delete(replyWait.requestId);
        clearReplyWaitState();
        setBusy(false);
      }
      activeAgentId = agentId;
      selectedTool = null;
      assistResultView = null;
      clearInteractionError();
      render();
    },
    setMode: (nextMode) => {
      mode = nextMode;
      render();
    },
    refresh: () => {
      render();
    },
    applyIntercomEvent,
  };
}
