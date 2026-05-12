/**
 * @packageDocumentation
 * @module @agent-play/play-ui/wallet-hud
 *
 * Small DOM "pill" overlay anchored top-right of the canvas that shows the
 * player's current wallet balance. The host fetches the balance via
 * `GET /agent-play/players/:id/wallet` (rewritten to the API route) at
 * bootstrap and then refreshes after every purchase.
 *
 * @see ../../web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts for
 *      the source endpoint.
 */

/**
 * Handle returned by {@link createWalletHud}.
 *
 * @public
 */
export type WalletHudHandle = {
  readonly root: HTMLElement;
  setBalance(balanceUsd: number): void;
  setLoading(): void;
  setError(message: string): void;
  destroy(): void;
};

/**
 * Options accepted by {@link createWalletHud}.
 *
 * @public
 */
export type CreateWalletHudOptions = {
  readonly parent: HTMLElement;
  /**
   * Optional click handler. When supplied, the HUD becomes a real
   * `<button>` and invokes this callback on click / Enter / Space.
   */
  readonly onClick?: () => void;
};

const HUD_CLASS = "preview-wallet-hud";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-wallet-hud-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${HUD_CLASS} {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 13000;
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fef3c7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 80ms ease, box-shadow 120ms ease, background 120ms ease;
}
.${HUD_CLASS}:hover {
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 4px 12px rgba(0,0,0,0.28);
  transform: translateY(-1px);
}
.${HUD_CLASS}:active { transform: translateY(0); }
.${HUD_CLASS}:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
.${HUD_CLASS}__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px rgba(52,211,153,0.6);
}
.${HUD_CLASS}--error .${HUD_CLASS}__dot { background: #f87171; }
.${HUD_CLASS}--loading .${HUD_CLASS}__dot { background: #fbbf24; }
.${HUD_CLASS}__caret {
  font-size: 10px;
  opacity: 0.7;
}
`;
  document.head.appendChild(style);
};

const formatUsd = (balanceUsd: number): string => {
  if (!Number.isFinite(balanceUsd)) return "$—";
  const rounded = Math.round(balanceUsd * 100) / 100;
  return `$${rounded.toFixed(2)}`;
};

/**
 * Mount the wallet HUD pill inside the supplied parent.
 *
 * @example
 * ```ts
 * const hud = createWalletHud({ parent: canvasHost });
 * hud.setLoading();
 * const wallet = await fetchWallet(playerId);
 * hud.setBalance(wallet.balanceUsd);
 * ```
 *
 * @public
 */
export const createWalletHud = (
  options: CreateWalletHudOptions
): WalletHudHandle => {
  ensureStyles();
  const root = document.createElement("button");
  root.type = "button";
  root.className = HUD_CLASS;
  root.setAttribute("aria-label", "Open wallet inventory");
  const dot = document.createElement("span");
  dot.className = `${HUD_CLASS}__dot`;
  const label = document.createElement("span");
  label.textContent = "$—";
  const caret = document.createElement("span");
  caret.className = `${HUD_CLASS}__caret`;
  caret.textContent = "▾";
  root.appendChild(dot);
  root.appendChild(label);
  root.appendChild(caret);
  options.parent.appendChild(root);
  if (typeof options.onClick === "function") {
    const onClick = options.onClick;
    root.addEventListener("click", () => {
      onClick();
    });
  }

  return {
    root,
    setBalance: (balanceUsd: number) => {
      root.classList.remove(`${HUD_CLASS}--loading`);
      root.classList.remove(`${HUD_CLASS}--error`);
      label.textContent = formatUsd(balanceUsd);
      root.title = `Wallet balance: ${formatUsd(balanceUsd)} — click to view items`;
    },
    setLoading: () => {
      root.classList.add(`${HUD_CLASS}--loading`);
      root.classList.remove(`${HUD_CLASS}--error`);
      label.textContent = "$…";
    },
    setError: (message: string) => {
      root.classList.add(`${HUD_CLASS}--error`);
      root.classList.remove(`${HUD_CLASS}--loading`);
      label.textContent = "$—";
      root.title = message;
    },
    destroy: () => {
      if (root.parentElement === options.parent) {
        options.parent.removeChild(root);
      }
    },
  };
};
