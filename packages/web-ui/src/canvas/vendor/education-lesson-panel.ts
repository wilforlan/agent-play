/**
 * Lesson reader + Joe teacher chat + ungraded reflection complete.
 */

import { renderChatMarkdown } from "./chat-markdown.js";
import type { JoeChatMessage } from "./education-joe-client.js";

const PANEL_CLASS = "preview-education-lesson";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-education-lesson-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed; inset: 0; z-index: 13340;
  background: rgba(8, 12, 20, 0.72);
  display: none; align-items: center; justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(980px, 96%); max-height: min(88vh, 820px);
  background: #0b1220; color: #e2e8f0;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  border: 1px solid rgba(94, 234, 212, 0.35);
  border-radius: 6px; box-shadow: 0 28px 80px rgba(0,0,0,0.55);
  display: flex; flex-direction: column; overflow: hidden;
}
.${PANEL_CLASS}__header {
  padding: 12px 14px; border-bottom: 1px solid rgba(94,234,212,0.22);
  background: linear-gradient(90deg, #0f172a, #111827 55%, #0b1220);
  display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;
}
.${PANEL_CLASS}__eyebrow {
  margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #5eead4;
}
.${PANEL_CLASS}__title { margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc; }
.${PANEL_CLASS}__status {
  margin: 0; font-size: 10px; letter-spacing: 0.08em; color: #94a3b8; white-space: nowrap;
}
.${PANEL_CLASS}__status-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 1px;
  background: #34d399; margin-right: 6px; box-shadow: 0 0 8px #34d399;
}
.${PANEL_CLASS}__split {
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  min-height: 0; flex: 1;
}
@media (max-width: 820px) {
  .${PANEL_CLASS}__split { grid-template-columns: 1fr; }
}
.${PANEL_CLASS}__lesson {
  display: flex; flex-direction: column; min-height: 0;
  border-right: 1px solid rgba(94,234,212,0.18);
  background: #fffef8; color: #1f2937;
  font-family: Georgia, "Times New Roman", serif;
}
.${PANEL_CLASS}__body {
  padding: 14px 16px; overflow: auto;
  font-size: 15px; line-height: 1.55; flex: 1;
}
.${PANEL_CLASS}__body > :first-child { margin-top: 0; }
.${PANEL_CLASS}__body > :last-child { margin-bottom: 0; }
.${PANEL_CLASS}__body h1,
.${PANEL_CLASS}__body h2,
.${PANEL_CLASS}__body h3,
.${PANEL_CLASS}__body h4 {
  margin: 1.1em 0 0.45em; line-height: 1.25; font-weight: 700; color: #14532d;
}
.${PANEL_CLASS}__body h1 { font-size: 1.35em; }
.${PANEL_CLASS}__body h2 { font-size: 1.2em; }
.${PANEL_CLASS}__body h3 { font-size: 1.08em; }
.${PANEL_CLASS}__body p { margin: 0.65em 0; }
.${PANEL_CLASS}__body ul,
.${PANEL_CLASS}__body ol { margin: 0.65em 0; padding-left: 1.35em; }
.${PANEL_CLASS}__body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em; background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px;
}
.${PANEL_CLASS}__assessment {
  padding: 10px 14px; border-top: 1px solid rgba(148,163,184,0.35);
  background: #f8fafc; font-family: system-ui, sans-serif;
}
.${PANEL_CLASS}__label {
  margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #334155;
}
.${PANEL_CLASS}__reflection {
  width: 100%; min-height: 52px; box-sizing: border-box;
  border: 1px solid rgba(148,163,184,0.55); border-radius: 8px;
  padding: 8px 10px; font: inherit; resize: vertical;
}
.${PANEL_CLASS}__joe {
  display: flex; flex-direction: column; min-height: 0; background: #070b14;
}
.${PANEL_CLASS}__joe-head {
  padding: 10px 12px; border-bottom: 1px solid rgba(94,234,212,0.18);
  font-size: 11px; letter-spacing: 0.1em; color: #5eead4; text-transform: uppercase;
}
.${PANEL_CLASS}__joe-stream {
  flex: 1; overflow: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px;
}
.${PANEL_CLASS}__bubble {
  border: 1px solid rgba(148,163,184,0.28); border-radius: 2px; padding: 8px 10px;
  background: #0f172a; max-width: 100%;
}
.${PANEL_CLASS}__bubble--student {
  align-self: flex-end; border-color: rgba(96,165,250,0.45); background: #0b1a33;
}
.${PANEL_CLASS}__bubble--joe {
  align-self: stretch; border-color: rgba(94,234,212,0.4);
}
.${PANEL_CLASS}__bubble-meta {
  margin: 0 0 6px; font-size: 10px; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase;
}
.${PANEL_CLASS}__bubble-text {
  margin: 0; font-size: 12px; line-height: 1.45; white-space: pre-wrap;
}
.${PANEL_CLASS}__joe-card {
  border: 1px solid rgba(94,234,212,0.35); background: #09111f; padding: 10px;
}
.${PANEL_CLASS}__joe-headline {
  margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #f8fafc;
}
.${PANEL_CLASS}__joe-block {
  margin: 0 0 8px; padding: 7px 8px; border-left: 2px solid #5eead4; background: rgba(15,23,42,0.85);
}
.${PANEL_CLASS}__joe-block-kind {
  display: block; font-size: 9px; letter-spacing: 0.12em; color: #5eead4; margin-bottom: 3px;
  text-transform: uppercase;
}
.${PANEL_CLASS}__joe-block-body {
  margin: 0; font-size: 12px; line-height: 1.45; color: #e2e8f0;
}
.${PANEL_CLASS}__joe-next {
  margin: 8px 0 0; font-size: 11px; color: #a5b4fc;
}
.${PANEL_CLASS}__joe-rel {
  margin: 4px 0 0; font-size: 10px; color: #64748b;
}
.${PANEL_CLASS}__composer {
  border-top: 1px solid rgba(94,234,212,0.18); padding: 10px 12px; display: flex; gap: 8px;
}
.${PANEL_CLASS}__composer input {
  flex: 1; border: 1px solid rgba(94,234,212,0.35); background: #0b1220; color: #f8fafc;
  border-radius: 2px; padding: 9px 10px; font: inherit; font-size: 12px;
}
.${PANEL_CLASS}__composer input:disabled { opacity: 0.55; }
.${PANEL_CLASS}__actions {
  padding: 10px 14px 12px; display: flex; gap: 8px;
  border-top: 1px solid rgba(94,234,212,0.18); background: #0b1220;
}
.${PANEL_CLASS}__btn {
  flex: 1; border: 1px solid rgba(94,234,212,0.35); padding: 10px 14px; border-radius: 2px;
  font-weight: 700; font-size: 12px; cursor: pointer; letter-spacing: 0.04em;
  background: transparent; color: #5eead4; font-family: inherit;
}
.${PANEL_CLASS}__btn--primary {
  background: #134e4a; color: #ecfdf5; border-color: #2dd4bf;
}
.${PANEL_CLASS}__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.${PANEL_CLASS}__error {
  margin: 0 12px 8px; font-size: 11px; color: #fca5a5;
}
`;
  document.head.appendChild(style);
};

export type EducationLessonPanelHandle = {
  show(input: {
    facultyLabel: string;
    pathTitle: string;
    lessonTitle: string;
    body: string;
    alreadyComplete?: boolean;
    onComplete?: (reflection: string) => void | Promise<void>;
    onLoadJoeChat?: () => Promise<readonly JoeChatMessage[]>;
    onSendJoeMessage?: (text: string) => Promise<readonly JoeChatMessage[]>;
  }): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

const renderJoeMessage = (message: JoeChatMessage): HTMLElement => {
  if (message.role === "student") {
    const bubble = document.createElement("div");
    bubble.className = `${PANEL_CLASS}__bubble ${PANEL_CLASS}__bubble--student`;
    const meta = document.createElement("p");
    meta.className = `${PANEL_CLASS}__bubble-meta`;
    meta.textContent = "STUDENT";
    const text = document.createElement("p");
    text.className = `${PANEL_CLASS}__bubble-text`;
    text.textContent = message.text;
    bubble.append(meta, text);
    return bubble;
  }
  const card = document.createElement("div");
  card.className = `${PANEL_CLASS}__joe-card`;
  const structured = message.structured;
  if (structured === undefined) {
    const meta = document.createElement("p");
    meta.className = `${PANEL_CLASS}__bubble-meta`;
    meta.textContent = "JOE";
    const text = document.createElement("div");
    text.className = `${PANEL_CLASS}__joe-block-body`;
    text.innerHTML = renderChatMarkdown(message.text);
    card.append(meta, text);
    return card;
  }
  const headline = document.createElement("p");
  headline.className = `${PANEL_CLASS}__joe-headline`;
  headline.textContent = structured.headline;
  card.appendChild(headline);
  for (const block of structured.blocks) {
    const wrap = document.createElement("div");
    wrap.className = `${PANEL_CLASS}__joe-block`;
    const kind = document.createElement("span");
    kind.className = `${PANEL_CLASS}__joe-block-kind`;
    kind.textContent = block.kind;
    const body = document.createElement("div");
    body.className = `${PANEL_CLASS}__joe-block-body`;
    body.innerHTML = renderChatMarkdown(block.body);
    wrap.append(kind, body);
    card.appendChild(wrap);
  }
  const next = document.createElement("p");
  next.className = `${PANEL_CLASS}__joe-next`;
  next.textContent = `NEXT // ${structured.nextMove}`;
  const rel = document.createElement("p");
  rel.className = `${PANEL_CLASS}__joe-rel`;
  rel.textContent = `REL ${structured.relevance.toFixed(2)}`;
  card.append(next, rel);
  return card;
};

export const createEducationLessonPanel = (options: {
  parent: HTMLElement;
}): EducationLessonPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const headerText = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = `${PANEL_CLASS}__eyebrow`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  headerText.append(eyebrow, title);
  const status = document.createElement("p");
  status.className = `${PANEL_CLASS}__status`;
  status.innerHTML = `<span class="${PANEL_CLASS}__status-dot"></span>JOE // ONLINE`;
  header.append(headerText, status);

  const split = document.createElement("div");
  split.className = `${PANEL_CLASS}__split`;

  const lessonCol = document.createElement("div");
  lessonCol.className = `${PANEL_CLASS}__lesson`;
  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const assessment = document.createElement("div");
  assessment.className = `${PANEL_CLASS}__assessment`;
  const label = document.createElement("p");
  label.className = `${PANEL_CLASS}__label`;
  label.textContent = "Reflection (optional, not graded)";
  const reflection = document.createElement("textarea");
  reflection.className = `${PANEL_CLASS}__reflection`;
  reflection.placeholder = "What will you practice next?";
  assessment.append(label, reflection);
  lessonCol.append(body, assessment);

  const joeCol = document.createElement("div");
  joeCol.className = `${PANEL_CLASS}__joe`;
  const joeHead = document.createElement("div");
  joeHead.className = `${PANEL_CLASS}__joe-head`;
  joeHead.textContent = "Teacher channel // Joe";
  const joeStream = document.createElement("div");
  joeStream.className = `${PANEL_CLASS}__joe-stream`;
  const joeError = document.createElement("p");
  joeError.className = `${PANEL_CLASS}__error`;
  joeError.hidden = true;
  const composer = document.createElement("div");
  composer.className = `${PANEL_CLASS}__composer`;
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask Joe about this lesson…";
  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  sendBtn.textContent = "SEND";
  composer.append(input, sendBtn);
  joeCol.append(joeHead, joeStream, joeError, composer);

  split.append(lessonCol, joeCol);

  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const completeBtn = document.createElement("button");
  completeBtn.type = "button";
  completeBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  completeBtn.textContent = "Mark lesson complete";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = `${PANEL_CLASS}__btn`;
  closeBtn.textContent = "Close lesson";
  actions.append(completeBtn, closeBtn);
  panel.append(header, split, actions);
  backdrop.appendChild(panel);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let onComplete: ((reflection: string) => void | Promise<void>) | null = null;
  let onSendJoeMessage:
    | ((text: string) => Promise<readonly JoeChatMessage[]>)
    | null = null;
  let busy = false;
  let joeBusy = false;

  const setJoeMessages = (messages: readonly JoeChatMessage[]): void => {
    joeStream.replaceChildren();
    if (messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = `${PANEL_CLASS}__joe-card`;
      empty.innerHTML = `<p class="${PANEL_CLASS}__joe-headline">BOOT SEQUENCE</p><p class="${PANEL_CLASS}__joe-block-body">Ask a question. I stay inside this lesson and build from your last turns.</p>`;
      joeStream.appendChild(empty);
      return;
    }
    for (const message of messages) {
      joeStream.appendChild(renderJoeMessage(message));
    }
    joeStream.scrollTop = joeStream.scrollHeight;
  };

  const close = (): void => {
    isOpen = false;
    busy = false;
    joeBusy = false;
    onComplete = null;
    onSendJoeMessage = null;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  completeBtn.addEventListener("click", () => {
    if (busy || onComplete === null) return;
    busy = true;
    completeBtn.disabled = true;
    completeBtn.textContent = "Saving…";
    void Promise.resolve(onComplete(reflection.value.trim())).finally(() => {
      close();
    });
  });

  const sendJoe = (): void => {
    if (joeBusy || onSendJoeMessage === null) return;
    const text = input.value.trim();
    if (text.length === 0) return;
    joeBusy = true;
    sendBtn.disabled = true;
    input.disabled = true;
    joeError.hidden = true;
    sendBtn.textContent = "…";
    void onSendJoeMessage(text)
      .then((messages) => {
        input.value = "";
        setJoeMessages(messages);
      })
      .catch((error: unknown) => {
        joeError.hidden = false;
        joeError.textContent =
          error instanceof Error
            ? error.message.replace(/^\[agent-play:joe\]\s*/, "")
            : "Joe is offline";
      })
      .finally(() => {
        joeBusy = false;
        sendBtn.disabled = false;
        input.disabled = false;
        sendBtn.textContent = "SEND";
        input.focus();
      });
  };
  sendBtn.addEventListener("click", sendJoe);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendJoe();
    }
  });

  return {
    show: (inputShow) => {
      eyebrow.textContent = `${inputShow.facultyLabel} · ${inputShow.pathTitle}`;
      title.textContent = inputShow.lessonTitle;
      body.innerHTML = renderChatMarkdown(inputShow.body);
      reflection.value = "";
      onComplete = inputShow.onComplete ?? null;
      onSendJoeMessage = inputShow.onSendJoeMessage ?? null;
      const already = inputShow.alreadyComplete === true;
      completeBtn.disabled = already || onComplete === null;
      completeBtn.textContent = already
        ? "Lesson already complete"
        : "Mark lesson complete";
      busy = false;
      joeBusy = false;
      joeError.hidden = true;
      sendBtn.disabled = onSendJoeMessage === null;
      input.disabled = onSendJoeMessage === null;
      setJoeMessages([]);
      isOpen = true;
      backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
      if (inputShow.onLoadJoeChat !== undefined) {
        void inputShow.onLoadJoeChat()
          .then((messages) => {
            if (isOpen) setJoeMessages(messages);
          })
          .catch(() => {
            if (isOpen) {
              joeError.hidden = false;
              joeError.textContent = "Could not load Joe history";
            }
          });
      }
    },
    close,
    isOpen: () => isOpen,
    destroy: () => {
      if (backdrop.parentElement === options.parent) {
        options.parent.removeChild(backdrop);
      }
    },
  };
};
