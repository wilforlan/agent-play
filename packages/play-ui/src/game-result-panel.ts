/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-result-panel
 *
 * DOM overlay shown after an arcade round completes. Displays net PU
 * earned and offers play-again, wallet, and back actions.
 *
 * @public
 */

const PANEL_CLASS = "preview-game-result";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-game-result-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed;
  inset: 0;
  z-index: 13200;
  background: rgba(15, 23, 42, 0.58);
  display: none;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(480px, 90%);
  background: #fdfbf4;
  color: #1f2937;
  font-family: system-ui, sans-serif;
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(15,23,42,0.42);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.${PANEL_CLASS}__header {
  padding: 20px 24px 16px 24px;
  text-align: center;
  background: linear-gradient(135deg, #0f172a, #1e3a5f);
  color: #f8fafc;
}
.${PANEL_CLASS}__title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin: 0 0 6px 0;
}
.${PANEL_CLASS}__subtitle {
  font-size: 13px;
  color: #cbd5e1;
  margin: 0;
}
.${PANEL_CLASS}__body {
  padding: 24px;
  text-align: center;
}
.${PANEL_CLASS}__net {
  font-size: 42px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
}
.${PANEL_CLASS}__net--positive { color: #047857; }
.${PANEL_CLASS}__net--negative { color: #b91c1c; }
.${PANEL_CLASS}__net--zero { color: #475569; }
.${PANEL_CLASS}__total {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 20px 0;
}
.${PANEL_CLASS}__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.${PANEL_CLASS}__btn {
  border: none;
  padding: 12px 18px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.${PANEL_CLASS}__btn--primary {
  background: #0f766e;
  color: #ecfdf5;
}
.${PANEL_CLASS}__btn--primary:hover { background: #115e59; }
.${PANEL_CLASS}__btn--secondary {
  background: #1f2937;
  color: #f8fafc;
}
.${PANEL_CLASS}__btn--secondary:hover { background: #111827; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid rgba(37,99,235,0.35);
}
.${PANEL_CLASS}__btn--ghost:hover {
  background: rgba(37,99,235,0.08);
}
`;
  document.head.appendChild(style);
};

/**
 * Payload accepted by {@link GameResultPanelHandle.show}.
 *
 * @public
 */
export type GameResultPanelShowInput = {
  readonly netPu: number;
  readonly totalPu: number;
  readonly onPlayAgain: () => void;
  readonly onWallet: () => void;
  readonly onBack: () => void;
};

/**
 * Handle returned by {@link createGameResultPanel}.
 *
 * @public
 */
export type GameResultPanelHandle = {
  readonly root: HTMLElement;
  show(input: GameResultPanelShowInput): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

/**
 * Options accepted by {@link createGameResultPanel}.
 *
 * @public
 */
export type CreateGameResultPanelOptions = {
  readonly parent: HTMLElement;
};

const formatPu = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${String(rounded)}`;
  return String(rounded);
};

/**
 * Create the post-round result panel.
 *
 * @public
 */
export const createGameResultPanel = (
  options: CreateGameResultPanelOptions
): GameResultPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Game result");

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);

  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  title.textContent = "Round complete";
  const subtitle = document.createElement("p");
  subtitle.className = `${PANEL_CLASS}__subtitle`;
  subtitle.textContent = "Nice work — here's how you did.";
  header.append(title, subtitle);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const netEl = document.createElement("p");
  netEl.className = `${PANEL_CLASS}__net`;
  const totalEl = document.createElement("p");
  totalEl.className = `${PANEL_CLASS}__total`;
  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  body.append(netEl, totalEl, actions);
  panel.appendChild(body);

  options.parent.appendChild(backdrop);

  let isOpen = false;

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  const show = (input: GameResultPanelShowInput): void => {
    isOpen = true;
    backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);

    const netRounded = Math.round(input.netPu);
    netEl.textContent = `${formatPu(netRounded)} PU`;
    netEl.className = `${PANEL_CLASS}__net ${
      netRounded > 0
        ? `${PANEL_CLASS}__net--positive`
        : netRounded < 0
          ? `${PANEL_CLASS}__net--negative`
          : `${PANEL_CLASS}__net--zero`
    }`;
    totalEl.textContent = `Wallet total: ${String(Math.max(0, Math.floor(input.totalPu)))} power-ups`;

    actions.innerHTML = "";
    const playAgain = document.createElement("button");
    playAgain.type = "button";
    playAgain.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
    playAgain.textContent = "Play again";
    playAgain.addEventListener("click", () => {
      close();
      input.onPlayAgain();
    });

    const wallet = document.createElement("button");
    wallet.type = "button";
    wallet.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--secondary`;
    wallet.textContent = "Open wallet";
    wallet.addEventListener("click", () => {
      close();
      input.onWallet();
    });

    const back = document.createElement("button");
    back.type = "button";
    back.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--ghost`;
    back.textContent = "Back to world";
    back.addEventListener("click", () => {
      close();
      input.onBack();
    });

    actions.append(playAgain, wallet, back);
  };

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && isOpen) close();
  };
  document.addEventListener("keydown", onKey);

  return {
    root: backdrop,
    show,
    close,
    isOpen: () => isOpen,
    destroy: () => {
      document.removeEventListener("keydown", onKey);
      if (backdrop.parentElement === options.parent) {
        options.parent.removeChild(backdrop);
      }
    },
  };
};
