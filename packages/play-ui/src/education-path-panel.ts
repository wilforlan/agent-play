/**
 * Path picker + annual school-fees confirmation for a faculty.
 */

export type EducationPathChoice = {
  readonly pathId: string;
  readonly title: string;
  readonly summary: string;
  readonly tier: "foundation" | "intermediate" | "advanced";
  readonly tuitionApw: number;
};

const PANEL_CLASS = "preview-education-path";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-education-path-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed; inset: 0; z-index: 13320;
  background: rgba(15, 23, 42, 0.62);
  display: none; align-items: center; justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(460px, 94%);
  background: #f7faf5; color: #1f2937;
  font-family: system-ui, sans-serif;
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(15,23,42,0.42);
  overflow: hidden;
}
.${PANEL_CLASS}__header {
  padding: 18px 22px 14px;
  background: linear-gradient(135deg, #14532d, #166534);
  color: #f0fdf4; text-align: center;
}
.${PANEL_CLASS}__title { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
.${PANEL_CLASS}__subtitle { margin: 0; font-size: 12px; color: #bbf7d0; }
.${PANEL_CLASS}__body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.${PANEL_CLASS}__path {
  text-align: left; border: 2px solid rgba(148,163,184,0.45);
  background: #fff; border-radius: 12px; padding: 10px 12px; cursor: pointer; color: inherit;
}
.${PANEL_CLASS}__path--selected {
  border-color: #166534; background: #f0fdf4;
}
.${PANEL_CLASS}__path-title { margin: 0 0 2px; font-weight: 700; font-size: 14px; }
.${PANEL_CLASS}__path-meta { margin: 0; font-size: 12px; color: #64748b; }
.${PANEL_CLASS}__error { margin: 0; min-height: 1.2em; font-size: 12px; color: #b91c1c; text-align: center; }
.${PANEL_CLASS}__actions { display: flex; flex-direction: column; gap: 8px; }
.${PANEL_CLASS}__btn {
  border: none; padding: 11px 16px; border-radius: 999px;
  font-weight: 700; font-size: 14px; cursor: pointer;
}
.${PANEL_CLASS}__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.${PANEL_CLASS}__btn--primary { background: #166534; color: #ecfdf5; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent; color: #2563eb;
  border: 1px solid rgba(37,99,235,0.35);
}
`;
  document.head.appendChild(style);
};

export type EducationPathPanelShowInput = {
  readonly facultyLabel: string;
  readonly paths: readonly EducationPathChoice[];
  readonly onSelectPath: (pathId: string) => void | Promise<void>;
  readonly onDismiss: () => void;
};

export type EducationPathPanelHandle = {
  show(input: EducationPathPanelShowInput): void;
  setBusy(busy: boolean): void;
  setError(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

export const createEducationPathPanel = (options: {
  parent: HTMLElement;
}): EducationPathPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);
  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  const subtitle = document.createElement("p");
  subtitle.className = `${PANEL_CLASS}__subtitle`;
  subtitle.textContent = "Choose a Senior High learning path, then pay annual school fees.";
  header.append(title, subtitle);
  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const list = document.createElement("div");
  const errorEl = document.createElement("p");
  errorEl.className = `${PANEL_CLASS}__error`;
  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const continueBtn = document.createElement("button");
  continueBtn.type = "button";
  continueBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--ghost`;
  dismissBtn.textContent = "Not now";
  actions.append(continueBtn, dismissBtn);
  body.append(list, errorEl, actions);
  panel.append(header, body);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let busy = false;
  let selected: string | null = null;
  let current: EducationPathPanelShowInput | null = null;

  const refresh = (): void => {
    if (current === null) return;
    title.textContent = `${current.facultyLabel} · Learning paths`;
    list.innerHTML = "";
    for (const path of current.paths) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `${PANEL_CLASS}__path${
        selected === path.pathId ? ` ${PANEL_CLASS}__path--selected` : ""
      }`;
      btn.dataset.pathId = path.pathId;
      const pathTitle = document.createElement("p");
      pathTitle.className = `${PANEL_CLASS}__path-title`;
      pathTitle.textContent = path.title;
      const meta = document.createElement("p");
      meta.className = `${PANEL_CLASS}__path-meta`;
      meta.textContent = `${path.tier} · APW$ ${path.tuitionApw.toFixed(0)} / year · ${path.summary}`;
      btn.append(pathTitle, meta);
      btn.addEventListener("click", () => {
        selected = path.pathId;
        refresh();
      });
      list.appendChild(btn);
    }
    continueBtn.disabled = busy || selected === null;
    continueBtn.textContent = busy ? "Opening…" : "Continue to school fees";
  };

  const close = (): void => {
    isOpen = false;
    busy = false;
    current = null;
    selected = null;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  continueBtn.addEventListener("click", () => {
    if (current === null || busy || selected === null) return;
    void current.onSelectPath(selected);
  });
  dismissBtn.addEventListener("click", () => {
    if (busy) return;
    const dismiss = current?.onDismiss;
    close();
    dismiss?.();
  });

  return {
    show: (input) => {
      current = input;
      selected = input.paths[0]?.pathId ?? null;
      busy = false;
      isOpen = true;
      errorEl.textContent = "";
      backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
      refresh();
    },
    setBusy: (next) => {
      busy = next;
      refresh();
    },
    setError: (message) => {
      errorEl.textContent = message;
      busy = false;
      refresh();
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
