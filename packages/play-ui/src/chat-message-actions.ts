/**
 * @module @agent-play/play-ui/chat-message-actions
 * Per-message reply / copy-link / reaction controls.
 */

import {
  type MessageReactionAction,
  type MessageReactionKind,
  type MessageReactions,
  hasPlayerReaction,
} from "./chat-message-reactions.js";

const STYLE_ID = "agent-play-chat-message-actions-styles";

type ActionIconId = "reply" | "link" | "love" | "like";

const ACTION_ICON_PATHS: Record<ActionIconId, string> = {
  reply:
    "M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  link: "M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 1 0 0 6h3v2h-3a5 5 0 0 1-5-5zm7-1h2v2h-2v-2zm4-4h3a5 5 0 1 1 0 10h-3v-2h3a3 3 0 1 0 0-6h-3V7z",
  love: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  like: "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z",
};

function createActionIcon(id: ActionIconId): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("chat-message-actions__icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ACTION_ICON_PATHS[id]);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.chat-message-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.chat-message-actions__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(30, 41, 59, 0.75);
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}
.chat-message-actions__btn[aria-pressed="true"] {
  border-color: rgba(250, 204, 21, 0.8);
  background: rgba(113, 63, 18, 0.55);
  color: #fef3c7;
}
.chat-message-actions__icon {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  display: block;
}
.chat-message-actions__label {
  white-space: nowrap;
}
.chat-message-actions__count {
  margin-left: 2px;
  opacity: 0.85;
}
`;
  document.head.append(style);
}

function appendLabeledControl(options: {
  button: HTMLButtonElement;
  icon: ActionIconId;
  label: string;
  count?: number;
}): void {
  options.button.append(createActionIcon(options.icon));
  const label = document.createElement("span");
  label.className = "chat-message-actions__label";
  label.textContent = options.label;
  options.button.append(label);
  if (typeof options.count === "number" && options.count > 0) {
    const count = document.createElement("span");
    count.className = "chat-message-actions__count";
    count.textContent = String(options.count);
    options.button.append(count);
  }
}

export function createChatMessageActions(options: {
  reactions: MessageReactions;
  playerId: string | null;
  canReply: boolean;
  onReply: () => void;
  onCopyLink: () => void;
  onReact: (input: {
    kind: MessageReactionKind;
    action: MessageReactionAction;
  }) => void;
}): { element: HTMLElement } {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "chat-message-actions";

  if (options.canReply) {
    const reply = document.createElement("button");
    reply.type = "button";
    reply.className = "chat-message-actions__btn chat-message-actions__reply";
    appendLabeledControl({ button: reply, icon: "reply", label: "Reply" });
    reply.addEventListener("click", options.onReply);
    root.append(reply);
  }

  const link = document.createElement("button");
  link.type = "button";
  link.className = "chat-message-actions__btn chat-message-actions__link";
  appendLabeledControl({ button: link, icon: "link", label: "Copy link" });
  link.addEventListener("click", options.onCopyLink);
  root.append(link);

  const makeReactionButton = (
    kind: MessageReactionKind,
    className: string,
    icon: ActionIconId,
    label: string
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chat-message-actions__btn ${className}`;
    const pressed =
      options.playerId !== null &&
      hasPlayerReaction(options.reactions, kind, options.playerId);
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    appendLabeledControl({
      button,
      icon,
      label,
      count: options.reactions[kind].length,
    });
    button.addEventListener("click", () => {
      options.onReact({
        kind,
        action: pressed ? "cancel" : "set",
      });
    });
    return button;
  };

  root.append(
    makeReactionButton("love", "chat-message-actions__love", "love", "Love"),
    makeReactionButton(
      "thumbs_up",
      "chat-message-actions__thumbs-up",
      "like",
      "Like"
    )
  );

  return { element: root };
}
