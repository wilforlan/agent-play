const STRIP_STYLE_ID = "agent-play-wallet-display-strip-styles";

const formatUsd = (balanceUsd: number): string => {
  if (!Number.isFinite(balanceUsd)) return "$—";
  const rounded = Math.round(balanceUsd * 100) / 100;
  return `$${rounded.toFixed(2)}`;
};

const ensureWalletStripStyles = (): void => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STRIP_STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STRIP_STYLE_ID;
  style.textContent = `
.agent-play-wallet-strip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.agent-play-wallet-strip__amount {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.agent-play-wallet-strip__power {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.agent-play-wallet-strip__diamond {
  width: 14px;
  height: 14px;
  transform: rotate(45deg);
  border-radius: 2px;
  border: 1px solid #3f4349;
  background: linear-gradient(135deg, #cfd2d6, #f2f3f5 50%, #8b9097);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}
.agent-play-wallet-strip__power-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 500;
  font-size: 0.92em;
  opacity: 0.92;
}
`;
  document.head.appendChild(style);
};

export type WalletDisplayStrip = {
  readonly root: HTMLElement;
  setBalance(balanceUsd: number): void;
  setBalanceLoading(): void;
  setPowerUps(n: number): void;
  setPowerUpsLoading(): void;
};

export const createWalletDisplayStrip = (): WalletDisplayStrip => {
  ensureWalletStripStyles();
  const root = document.createElement("span");
  root.className = "agent-play-wallet-strip";
  const amount = document.createElement("span");
  amount.className = "agent-play-wallet-strip__amount";
  amount.textContent = "$—";
  const powerWrap = document.createElement("span");
  powerWrap.className = "agent-play-wallet-strip__power";
  const diamond = document.createElement("span");
  diamond.className = "agent-play-wallet-strip__diamond";
  diamond.setAttribute("aria-hidden", "true");
  const powerCount = document.createElement("span");
  powerCount.className = "agent-play-wallet-strip__power-count";
  powerCount.textContent = "0";
  powerWrap.append(diamond, powerCount);
  root.append(amount, powerWrap);
  return {
    root,
    setBalance: (balanceUsd: number) => {
      amount.textContent = formatUsd(balanceUsd);
    },
    setBalanceLoading: () => {
      amount.textContent = "$…";
    },
    setPowerUps: (n: number) => {
      if (!Number.isFinite(n) || n < 0) {
        powerCount.textContent = "0";
        return;
      }
      powerCount.textContent = String(Math.floor(n));
    },
    setPowerUpsLoading: () => {
      powerCount.textContent = "—";
    },
  };
};
