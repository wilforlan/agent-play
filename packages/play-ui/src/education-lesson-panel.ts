/**
 * Lesson reader + ungraded reflection complete for faculty class mode.
 */

import { renderChatMarkdown } from "./chat-markdown.js";

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
  background: rgba(15, 23, 42, 0.55);
  display: none; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(560px, 94%); max-height: min(80vh, 720px);
  background: #fffef8; color: #1f2937;
  font-family: Georgia, "Times New Roman", serif;
  border-radius: 16px; box-shadow: 0 24px 70px rgba(15,23,42,0.4);
  display: flex; flex-direction: column; overflow: hidden;
}
.${PANEL_CLASS}__header {
  padding: 16px 18px 12px; border-bottom: 1px solid rgba(148,163,184,0.35);
  background: #f8fafc;
}
.${PANEL_CLASS}__eyebrow {
  margin: 0 0 4px; font-family: system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #64748b;
}
.${PANEL_CLASS}__title { margin: 0; font-size: 22px; font-weight: 700; }
.${PANEL_CLASS}__body {
  padding: 16px 18px; overflow: auto;
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
.${PANEL_CLASS}__body h4 { font-size: 1em; }
.${PANEL_CLASS}__body p { margin: 0.65em 0; }
.${PANEL_CLASS}__body ul,
.${PANEL_CLASS}__body ol { margin: 0.65em 0; padding-left: 1.35em; }
.${PANEL_CLASS}__body li { margin: 0.25em 0; }
.${PANEL_CLASS}__body blockquote {
  margin: 0.75em 0; padding: 0.35em 0 0.35em 0.9em;
  border-left: 3px solid rgba(22, 101, 52, 0.35); color: #475569;
}
.${PANEL_CLASS}__body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em; background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px;
}
.${PANEL_CLASS}__body pre {
  margin: 0.75em 0; padding: 10px 12px; overflow: auto;
  background: #f1f5f9; border-radius: 10px;
}
.${PANEL_CLASS}__body pre code { background: transparent; padding: 0; }
.${PANEL_CLASS}__body a { color: #166534; }
.${PANEL_CLASS}__body hr {
  border: none; border-top: 1px solid rgba(148,163,184,0.45); margin: 1em 0;
}
.${PANEL_CLASS}__body table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
.${PANEL_CLASS}__body th,
.${PANEL_CLASS}__body td {
  border: 1px solid rgba(148,163,184,0.45); padding: 6px 8px; text-align: left;
}
.${PANEL_CLASS}__assessment {
  padding: 12px 18px; border-top: 1px solid rgba(148,163,184,0.35);
  background: #f8fafc; font-family: system-ui, sans-serif;
}
.${PANEL_CLASS}__label {
  margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #334155;
}
.${PANEL_CLASS}__reflection {
  width: 100%; min-height: 64px; box-sizing: border-box;
  border: 1px solid rgba(148,163,184,0.55); border-radius: 10px;
  padding: 8px 10px; font: inherit; resize: vertical;
}
.${PANEL_CLASS}__actions {
  padding: 12px 18px 16px; display: flex; flex-direction: column; gap: 8px;
  font-family: system-ui, sans-serif;
}
.${PANEL_CLASS}__btn {
  width: 100%; border: none; padding: 11px 16px; border-radius: 999px;
  font-weight: 700; font-size: 14px; cursor: pointer;
}
.${PANEL_CLASS}__btn--primary { background: #166534; color: #ecfdf5; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent; color: #2563eb; border: 1px solid rgba(37,99,235,0.35);
}
.${PANEL_CLASS}__btn:disabled { opacity: 0.55; cursor: not-allowed; }
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
  }): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
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
  const eyebrow = document.createElement("p");
  eyebrow.className = `${PANEL_CLASS}__eyebrow`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  header.append(eyebrow, title);
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
  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const completeBtn = document.createElement("button");
  completeBtn.type = "button";
  completeBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  completeBtn.textContent = "Mark lesson complete";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--ghost`;
  closeBtn.textContent = "Close lesson";
  actions.append(completeBtn, closeBtn);
  panel.append(header, body, assessment, actions);
  backdrop.appendChild(panel);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let onComplete: ((reflection: string) => void | Promise<void>) | null = null;
  let busy = false;

  const close = (): void => {
    isOpen = false;
    busy = false;
    onComplete = null;
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

  return {
    show: (input) => {
      eyebrow.textContent = `${input.facultyLabel} · ${input.pathTitle}`;
      title.textContent = input.lessonTitle;
      body.innerHTML = renderChatMarkdown(input.body);
      reflection.value = "";
      onComplete = input.onComplete ?? null;
      const already = input.alreadyComplete === true;
      completeBtn.disabled = already || onComplete === null;
      completeBtn.textContent = already
        ? "Lesson already complete"
        : "Mark lesson complete";
      busy = false;
      isOpen = true;
      backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
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
