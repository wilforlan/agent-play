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

const HUD_CLASS = "preview-wallet-hud";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-wallet-hud-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${HUD_CLASS} {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 30;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fef3c7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
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
export const createWalletHud = (options: {
  parent: HTMLElement;
}): WalletHudHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = HUD_CLASS;
  const dot = document.createElement("span");
  dot.className = `${HUD_CLASS}__dot`;
  const label = document.createElement("span");
  label.textContent = "$—";
  root.appendChild(dot);
  root.appendChild(label);
  options.parent.appendChild(root);

  return {
    root,
    setBalance: (balanceUsd: number) => {
      root.classList.remove(`${HUD_CLASS}--loading`);
      root.classList.remove(`${HUD_CLASS}--error`);
      label.textContent = formatUsd(balanceUsd);
      root.title = `Wallet balance: ${formatUsd(balanceUsd)}`;
    },
    setLoading: () => {
      root.classList.add(`${HUD_CLASS}--loading`);
      root.classList.remove(`${HUD_CLASS}--error`);
      label.textContent = "$…";
    },
    setError: (message: string) => {
      root.classList.add(`${HUD_CLASS}--error`);
      root.classList.remove(`${HUD_CLASS}--loading`);
      label.textContent = "—";
      root.title = message;
    },
    destroy: () => {
      if (root.parentElement === options.parent) {
        options.parent.removeChild(root);
      }
    },
  };
};
