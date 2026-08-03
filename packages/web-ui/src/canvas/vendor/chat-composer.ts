/**
 * @module @agent-play/play-ui/chat-composer
 * Shared multiline chat composer with emoji picker and reply chip.
 */

import { CHAT_EMOJI_CATALOG } from "./chat-emoji-catalog.js";

const STYLE_ID = "agent-play-chat-composer-styles";

export type ChatComposerReplyTarget = {
  requestId: string;
  previewText: string;
};

export type ChatComposerSubmit = {
  text: string;
  parentRequestId: string | null;
};

export type ChatComposerHandle = {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getReplyTarget: () => ChatComposerReplyTarget | null;
  setReplyTarget: (target: ChatComposerReplyTarget | null) => void;
  focus: () => void;
  setDisabled: (disabled: boolean) => void;
};

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.chat-composer {
  display: grid;
  gap: 6px;
}
.chat-composer__reply-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(30, 41, 59, 0.85);
  color: #bfdbfe;
  font-size: 12px;
  line-height: 1.3;
}
.chat-composer__reply-chip[hidden] {
  display: none !important;
}
.chat-composer__reply-cancel {
  border: 0;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.chat-composer__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6px;
  align-items: end;
}
.chat-composer__emoji-toggle,
.chat-composer__send {
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.65);
  background: rgba(30, 64, 175, 0.48);
  color: #eff6ff;
  cursor: pointer;
  min-height: 40px;
  padding: 8px 10px;
  font-size: 13px;
}
.chat-composer__send {
  background: linear-gradient(180deg, #1d4ed8, #2563eb);
  font-weight: 700;
}
.chat-composer__input {
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.45;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  resize: vertical;
  min-height: 40px;
  max-height: 140px;
}
.chat-composer__emoji-panel {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(15, 23, 42, 0.95);
  max-height: 160px;
  overflow-y: auto;
}
.chat-composer__emoji-panel[hidden] {
  display: none !important;
}
.chat-composer__emoji-option {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1.2;
  padding: 4px;
  border-radius: 6px;
}
.chat-composer__emoji-option:hover,
.chat-composer__emoji-option:focus-visible {
  background: rgba(51, 65, 85, 0.9);
}
`;
  document.head.append(style);
}

export function createChatComposer(options: {
  placeholder: string;
  onSubmit: (value: ChatComposerSubmit) => void;
  sendLabel?: string;
}): ChatComposerHandle {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "chat-composer";

  const replyChip = document.createElement("div");
  replyChip.className = "chat-composer__reply-chip";
  replyChip.hidden = true;
  const replyText = document.createElement("span");
  replyText.className = "chat-composer__reply-text";
  const replyCancel = document.createElement("button");
  replyCancel.type = "button";
  replyCancel.className = "chat-composer__reply-cancel";
  replyCancel.setAttribute("aria-label", "Cancel reply");
  replyCancel.textContent = "×";
  replyChip.append(replyText, replyCancel);

  const row = document.createElement("div");
  row.className = "chat-composer__row";
  const emojiToggle = document.createElement("button");
  emojiToggle.type = "button";
  emojiToggle.className = "chat-composer__emoji-toggle";
  emojiToggle.setAttribute("aria-label", "Insert emoji");
  emojiToggle.textContent = "☺";
  const input = document.createElement("textarea");
  input.className = "chat-composer__input";
  input.placeholder = options.placeholder;
  input.rows = 1;
  input.setAttribute("aria-label", options.placeholder);
  const send = document.createElement("button");
  send.type = "button";
  send.className = "chat-composer__send";
  send.textContent = options.sendLabel ?? "Send";
  row.append(emojiToggle, input, send);

  const emojiPanel = document.createElement("div");
  emojiPanel.className = "chat-composer__emoji-panel";
  emojiPanel.hidden = true;
  for (const emoji of CHAT_EMOJI_CATALOG) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-composer__emoji-option";
    button.textContent = emoji;
    button.setAttribute("aria-label", `Insert ${emoji}`);
    button.addEventListener("click", () => {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
      const next = start + emoji.length;
      input.focus();
      input.setSelectionRange(next, next);
      emojiPanel.hidden = true;
    });
    emojiPanel.append(button);
  }

  root.append(replyChip, row, emojiPanel);

  let replyTarget: ChatComposerReplyTarget | null = null;

  const renderReplyChip = (): void => {
    if (replyTarget === null) {
      replyChip.hidden = true;
      replyText.textContent = "";
      return;
    }
    replyChip.hidden = false;
    const preview =
      replyTarget.previewText.trim().length > 72
        ? `${replyTarget.previewText.trim().slice(0, 72)}…`
        : replyTarget.previewText.trim();
    replyText.textContent = `Replying to: ${preview}`;
  };

  const submit = (): void => {
    const text = input.value.trim();
    if (text.length === 0) return;
    const parentRequestId = replyTarget?.requestId ?? null;
    options.onSubmit({ text, parentRequestId });
    input.value = "";
    replyTarget = null;
    renderReplyChip();
    emojiPanel.hidden = true;
  };

  send.addEventListener("click", submit);
  emojiToggle.addEventListener("click", () => {
    emojiPanel.hidden = !emojiPanel.hidden;
  });
  replyCancel.addEventListener("click", () => {
    replyTarget = null;
    renderReplyChip();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    submit();
  });

  return {
    element: root,
    getValue: () => input.value,
    setValue: (value) => {
      input.value = value;
    },
    getReplyTarget: () => replyTarget,
    setReplyTarget: (target) => {
      replyTarget = target;
      renderReplyChip();
      if (target !== null) {
        input.focus();
      }
    },
    focus: () => {
      input.focus();
    },
    setDisabled: (disabled) => {
      input.disabled = disabled;
      send.disabled = disabled;
      emojiToggle.disabled = disabled;
      replyCancel.disabled = disabled;
    },
  };
}
