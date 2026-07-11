const STYLE_ID = "preview-house-purchase-panel-styles";

const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`;

const ensureStyles = (): void => {
  if (document.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.preview-house-purchase-panel {
  position: fixed;
  z-index: 12000;
  min-width: 240px;
  max-width: 300px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.96);
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  display: none;
}
.preview-house-purchase-panel--open { display: block; }
.preview-house-purchase-panel__title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
}
.preview-house-purchase-panel__meta {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 10px;
}
.preview-house-purchase-panel__owned {
  color: #fcd34d;
  font-size: 13px;
  margin-bottom: 8px;
}
.preview-house-purchase-panel button {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.preview-house-purchase-panel button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.preview-house-purchase-panel__error {
  color: #fca5a5;
  font-size: 12px;
  margin-bottom: 8px;
}
.preview-house-purchase-panel__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: preview-house-spin 0.8s linear infinite;
  vertical-align: -2px;
  margin-right: 6px;
}
@keyframes preview-house-spin {
  to { transform: rotate(360deg); }
}
`;
  document.head.appendChild(style);
};

export type HousePurchasePanelHandle = {
  readonly root: HTMLElement;
  show(input: {
    houseId: number;
    layoutLabel: string;
    priceUsd: number;
    ownerDisplayName: string | null;
    balanceUsd: number | null;
    onBuy: () => void;
  }): void;
  hide(): void;
  setBusy(): void;
  setError(message: string): void;
  isOpen(): boolean;
  destroy(): void;
};

export const createHousePurchasePanel = (): HousePurchasePanelHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "preview-house-purchase-panel";
  const title = document.createElement("div");
  title.className = "preview-house-purchase-panel__title";
  const meta = document.createElement("div");
  meta.className = "preview-house-purchase-panel__meta";
  const owned = document.createElement("div");
  owned.className = "preview-house-purchase-panel__owned";
  owned.hidden = true;
  const error = document.createElement("div");
  error.className = "preview-house-purchase-panel__error";
  error.hidden = true;
  const buyBtn = document.createElement("button");
  buyBtn.type = "button";
  buyBtn.textContent = "Buy house";
  root.append(title, meta, owned, error, buyBtn);
  document.body.appendChild(root);

  let onBuy: (() => void) | null = null;
  let busy = false;

  buyBtn.addEventListener("click", () => {
    if (busy || onBuy === null || buyBtn.disabled) {
      return;
    }
    onBuy();
  });

  return {
    root,
    show(input) {
      error.hidden = true;
      busy = false;
      title.textContent = `House ${String(input.houseId)}`;
      meta.textContent = `${input.layoutLabel} · ${formatUsd(input.priceUsd)}`;
      if (input.ownerDisplayName !== null) {
        owned.hidden = false;
        owned.textContent = `Owned by ${input.ownerDisplayName}`;
        buyBtn.disabled = true;
        buyBtn.textContent = "Not for sale";
        onBuy = null;
      } else {
        owned.hidden = true;
        const balance = input.balanceUsd;
        const canAfford =
          balance !== null && Number.isFinite(balance) && balance >= input.priceUsd;
        buyBtn.disabled = !canAfford;
        buyBtn.textContent = canAfford
          ? `Buy for ${formatUsd(input.priceUsd)}`
          : "Insufficient funds";
        onBuy = input.onBuy;
      }
      root.classList.add("preview-house-purchase-panel--open");
    },
    hide() {
      root.classList.remove("preview-house-purchase-panel--open");
      busy = false;
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy house";
      onBuy = null;
    },
    setBusy() {
      busy = true;
      buyBtn.disabled = true;
      buyBtn.innerHTML =
        '<span class="preview-house-purchase-panel__spinner"></span>Buying…';
    },
    setError(message) {
      busy = false;
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy house";
      error.textContent = message;
      error.hidden = false;
    },
    isOpen() {
      return root.classList.contains("preview-house-purchase-panel--open");
    },
    destroy() {
      root.remove();
    },
  };
};
