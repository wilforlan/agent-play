/**
 * Lesson reader panel for faculty class mode.
 */

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
  padding: 16px 18px; overflow: auto; white-space: pre-wrap;
  font-size: 15px; line-height: 1.55;
}
.${PANEL_CLASS}__actions { padding: 12px 18px 16px; }
.${PANEL_CLASS}__btn {
  width: 100%; border: none; padding: 11px 16px; border-radius: 999px;
  font-family: system-ui, sans-serif; font-weight: 700; font-size: 14px;
  cursor: pointer; background: #166534; color: #ecfdf5;
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
  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = `${PANEL_CLASS}__btn`;
  closeBtn.textContent = "Close lesson";
  actions.appendChild(closeBtn);
  panel.append(header, body, actions);
  backdrop.appendChild(panel);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  const close = (): void => {
    isOpen = false;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  return {
    show: (input) => {
      eyebrow.textContent = `${input.facultyLabel} · ${input.pathTitle}`;
      title.textContent = input.lessonTitle;
      body.textContent = input.body;
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
