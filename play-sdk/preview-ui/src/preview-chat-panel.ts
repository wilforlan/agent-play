import { renderChatMarkdown } from "./chat-markdown.js";
import { interactionRoleToBubbleClass } from "./chat-role.js";
import { getChatLogLines } from "./preview-chat-log.js";

const PANEL_MAX_HEIGHT_PX = 100;
const STYLE_ID = "agent-play-preview-chat-styles";

export function ensurePreviewChatStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.preview-chat-outer {
  flex-shrink: 0;
  margin-top: 8px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(248, 250, 252, 0.97);
  box-shadow: 0 -2px 12px rgba(15, 23, 42, 0.08);
}
.preview-chat-scroll {
  max-height: ${PANEL_MAX_HEIGHT_PX}px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 10px;
  scroll-behavior: smooth;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: #0f172a;
}
.preview-chat-scroll::-webkit-scrollbar {
  width: 6px;
}
.preview-chat-scroll::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.45);
  border-radius: 6px;
}
.preview-chat-scroll::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.9);
  border-radius: 6px;
}
.preview-chat-bubble {
  margin-bottom: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.preview-chat-bubble:last-child {
  margin-bottom: 0;
}
.preview-chat-bubble--user {
  background: linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: rgba(37, 99, 235, 0.22);
}
.preview-chat-bubble--assistant {
  background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: rgba(5, 150, 105, 0.25);
}
.preview-chat-bubble--tool {
  background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
  border-color: rgba(180, 83, 9, 0.25);
}
.preview-chat-meta {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
  margin-bottom: 4px;
}
.preview-chat-body {
  color: #0f172a;
}
.preview-chat-body p {
  margin: 0 0 0.45em 0;
}
.preview-chat-body p:last-child {
  margin-bottom: 0;
}
.preview-chat-body h1, .preview-chat-body h2, .preview-chat-body h3, .preview-chat-body h4 {
  margin: 0.35em 0 0.25em 0;
  font-size: 1em;
  font-weight: 700;
}
.preview-chat-body ul, .preview-chat-body ol {
  margin: 0.35em 0;
  padding-left: 1.35em;
}
.preview-chat-body li {
  margin: 0.2em 0;
}
.preview-chat-body pre {
  margin: 0.45em 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.1);
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
  font-family: ui-monospace, "Cascadia Code", monospace;
}
.preview-chat-body code {
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-size: 0.92em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.07);
}
.preview-chat-body pre code {
  padding: 0;
  background: none;
}
.preview-chat-body blockquote {
  margin: 0.45em 0;
  padding-left: 0.75em;
  border-left: 3px solid rgba(37, 99, 235, 0.35);
  color: rgba(15, 23, 42, 0.8);
}
.preview-chat-body a {
  color: #2563eb;
  text-decoration: underline;
}
.preview-chat-body table {
  border-collapse: collapse;
  margin: 0.45em 0;
  font-size: 12px;
}
.preview-chat-body th, .preview-chat-body td {
  border: 1px solid rgba(15, 23, 42, 0.15);
  padding: 4px 8px;
}
.preview-chat-body hr {
  margin: 0.5em 0;
  border: none;
  border-top: 1px solid rgba(15, 23, 42, 0.12);
}
`;
  document.head.append(s);
}

export function createPreviewChatPanel(options: {
  widthPx: number;
}): {
  element: HTMLElement;
  refresh: () => void;
} {
  const wrap = document.createElement("div");
  wrap.className = "preview-chat-outer";
  wrap.style.width = `${options.widthPx}px`;
  wrap.style.maxWidth = "100%";

  const scroll = document.createElement("div");
  scroll.className = "preview-chat-scroll";
  scroll.setAttribute("role", "log");
  scroll.setAttribute("aria-live", "polite");
  scroll.setAttribute("aria-relevant", "additions text");

  wrap.appendChild(scroll);

  const refresh = (): void => {
    scroll.replaceChildren();
    for (const line of getChatLogLines()) {
      const row = document.createElement("article");
      row.className = `preview-chat-bubble ${interactionRoleToBubbleClass(line.role)}`;
      const meta = document.createElement("div");
      meta.className = "preview-chat-meta";
      meta.textContent = `${line.playerName} · ${line.role}`;
      const body = document.createElement("div");
      body.className = "preview-chat-body";
      body.innerHTML = renderChatMarkdown(line.text);
      row.append(meta, body);
      scroll.append(row);
    }
    scroll.scrollTop = scroll.scrollHeight;
  };

  return { element: wrap, refresh };
}
