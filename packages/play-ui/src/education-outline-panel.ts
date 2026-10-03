/**
 * Course outline + progress HUD for faculty class mode.
 */

const PANEL_CLASS = "preview-education-outline";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-education-outline-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS} {
  position: absolute; top: 12px; left: 12px; z-index: 40;
  width: min(280px, calc(100% - 24px));
  background: rgba(248, 250, 252, 0.96);
  border: 1px solid rgba(22, 101, 52, 0.28);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
  font-family: system-ui, sans-serif; color: #14532d;
  padding: 12px 12px 10px; pointer-events: none;
}
.${PANEL_CLASS}__title { margin: 0 0 2px; font-size: 13px; font-weight: 800; }
.${PANEL_CLASS}__meta { margin: 0 0 8px; font-size: 11px; color: #64748b; }
.${PANEL_CLASS}__bar {
  height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-bottom: 8px;
}
.${PANEL_CLASS}__bar-fill {
  height: 100%; background: #166534; width: 0%; transition: width 180ms ease;
}
.${PANEL_CLASS}__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow: auto; }
.${PANEL_CLASS}__item {
  margin: 0; font-size: 11px; line-height: 1.3; color: #334155;
  display: flex; gap: 6px; align-items: flex-start;
}
.${PANEL_CLASS}__item--selected { color: #14532d; font-weight: 700; }
.${PANEL_CLASS}__item--complete { color: #166534; }
.${PANEL_CLASS}__mark { flex: 0 0 auto; width: 12px; text-align: center; }
`;
  document.head.appendChild(style);
};

export type EducationOutlineLesson = {
  readonly lessonId: string;
  readonly title: string;
  readonly order: number;
  readonly complete: boolean;
};

export type EducationOutlinePanelHandle = {
  show(input: {
    pathTitle: string;
    lessons: readonly EducationOutlineLesson[];
    selectedLessonId: string | null;
  }): void;
  update(input: {
    lessons: readonly EducationOutlineLesson[];
    selectedLessonId: string | null;
  }): void;
  hide(): void;
  destroy(): void;
};

export const createEducationOutlinePanel = (options: {
  parent: HTMLElement;
}): EducationOutlinePanelHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = PANEL_CLASS;
  root.hidden = true;
  const title = document.createElement("p");
  title.className = `${PANEL_CLASS}__title`;
  const meta = document.createElement("p");
  meta.className = `${PANEL_CLASS}__meta`;
  const bar = document.createElement("div");
  bar.className = `${PANEL_CLASS}__bar`;
  const fill = document.createElement("div");
  fill.className = `${PANEL_CLASS}__bar-fill`;
  bar.appendChild(fill);
  const list = document.createElement("ul");
  list.className = `${PANEL_CLASS}__list`;
  root.append(title, meta, bar, list);
  options.parent.appendChild(root);

  let pathTitle = "Learning path";

  const render = (input: {
    lessons: readonly EducationOutlineLesson[];
    selectedLessonId: string | null;
  }): void => {
    const complete = input.lessons.filter((lesson) => lesson.complete).length;
    const total = input.lessons.length;
    title.textContent = pathTitle;
    meta.textContent = `${String(complete)} / ${String(total)} lessons complete`;
    fill.style.width =
      total === 0 ? "0%" : `${String(Math.round((complete / total) * 100))}%`;
    list.replaceChildren();
    for (const lesson of input.lessons) {
      const item = document.createElement("li");
      item.className = `${PANEL_CLASS}__item`;
      if (lesson.complete) item.classList.add(`${PANEL_CLASS}__item--complete`);
      if (input.selectedLessonId === lesson.lessonId) {
        item.classList.add(`${PANEL_CLASS}__item--selected`);
      }
      const mark = document.createElement("span");
      mark.className = `${PANEL_CLASS}__mark`;
      mark.textContent = lesson.complete ? "[x]" : "[ ]";
      const label = document.createElement("span");
      label.textContent = `${String(lesson.order)}. ${lesson.title}`;
      item.append(mark, label);
      list.appendChild(item);
    }
  };

  return {
    show: (input) => {
      pathTitle = input.pathTitle;
      root.hidden = false;
      render(input);
    },
    update: (input) => {
      if (root.hidden) return;
      render(input);
    },
    hide: () => {
      root.hidden = true;
    },
    destroy: () => {
      if (root.parentElement === options.parent) {
        options.parent.removeChild(root);
      }
    },
  };
};
