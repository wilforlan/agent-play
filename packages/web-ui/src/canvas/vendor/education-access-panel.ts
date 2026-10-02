/**
 * @packageDocumentation
 * @module @agent-play/play-ui/education-access-panel
 *
 * Elm Street education center day-entry gate with dual-tender pricing.
 *
 * @public
 */

import type { EducationTender } from "./education-access-client.js";
import {
  educationFinanceHubCtaStyles,
  mountEducationFinanceHubCta,
  shouldShowEducationFinanceHubCta,
} from "./education-finance-hub-cta.js";

const PANEL_CLASS = "preview-education-access";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-education-access-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed;
  inset: 0;
  z-index: 13310;
  background: rgba(15, 23, 42, 0.62);
  display: none;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(420px, 92%);
  background: #f7faf5;
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
  background: linear-gradient(135deg, #14532d, #166534);
  color: #f0fdf4;
}
.${PANEL_CLASS}__title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.4px;
  margin: 0 0 6px 0;
}
.${PANEL_CLASS}__subtitle {
  font-size: 13px;
  color: #bbf7d0;
  margin: 0;
}
.${PANEL_CLASS}__body {
  padding: 20px 22px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.${PANEL_CLASS}__price-card {
  border: 2px solid rgba(22, 101, 52, 0.35);
  background: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  text-align: center;
}
.${PANEL_CLASS}__price-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 4px 0;
}
.${PANEL_CLASS}__price {
  font-size: 28px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin: 0;
  color: #14532d;
}
.${PANEL_CLASS}__price-meta {
  font-size: 12px;
  color: #64748b;
  margin: 6px 0 0 0;
}
.${PANEL_CLASS}__tender {
  font-size: 13px;
  color: #334155;
  margin: 0;
  text-align: center;
}
.${PANEL_CLASS}__wallet {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  text-align: center;
}
.${PANEL_CLASS}__error {
  font-size: 12px;
  color: #b91c1c;
  margin: 0;
  text-align: center;
  min-height: 1.2em;
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
.${PANEL_CLASS}__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.${PANEL_CLASS}__btn--primary {
  background: #166534;
  color: #ecfdf5;
}
.${PANEL_CLASS}__btn--primary:hover:not(:disabled) { background: #14532d; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid rgba(37,99,235,0.35);
}
.${PANEL_CLASS}__btn--ghost:hover { background: rgba(37,99,235,0.08); }
${educationFinanceHubCtaStyles(PANEL_CLASS)}
`;
  document.head.appendChild(style);
};

export type EducationAccessPanelShowInput = {
  readonly centerId: string;
  readonly centerLabel: string;
  readonly apuCost: number;
  readonly quoteApw: number;
  readonly preferredTender: EducationTender;
  readonly balanceUsd: number;
  readonly powerUps: number;
  readonly canAfford: boolean;
  readonly onPurchase: () => void | Promise<void>;
  readonly onDismiss: () => void;
};

export type EducationAccessPanelHandle = {
  readonly root: HTMLElement;
  show(input: EducationAccessPanelShowInput): void;
  setBusy(busy: boolean): void;
  setError(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

export type CreateEducationAccessPanelOptions = {
  readonly parent: HTMLElement;
};

const formatApw = (amount: number): string => `APW$ ${amount.toFixed(2)}`;

/**
 * Create the education center day-entry gate panel.
 *
 * @public
 */
export const createEducationAccessPanel = (
  options: CreateEducationAccessPanelOptions
): EducationAccessPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Education day entry");

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);

  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  title.textContent = "Elm Street · Day entry";
  const subtitle = document.createElement("p");
  subtitle.className = `${PANEL_CLASS}__subtitle`;
  subtitle.textContent = "Pay once per center for today’s UTC day.";
  header.append(title, subtitle);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;

  const priceCard = document.createElement("div");
  priceCard.className = `${PANEL_CLASS}__price-card`;
  const priceLabel = document.createElement("p");
  priceLabel.className = `${PANEL_CLASS}__price-label`;
  const priceEl = document.createElement("p");
  priceEl.className = `${PANEL_CLASS}__price`;
  const priceMeta = document.createElement("p");
  priceMeta.className = `${PANEL_CLASS}__price-meta`;
  priceCard.append(priceLabel, priceEl, priceMeta);

  const tenderEl = document.createElement("p");
  tenderEl.className = `${PANEL_CLASS}__tender`;
  const walletEl = document.createElement("p");
  walletEl.className = `${PANEL_CLASS}__wallet`;
  const errorEl = document.createElement("p");
  errorEl.className = `${PANEL_CLASS}__error`;
  const financeHubEl = document.createElement("div");
  financeHubEl.className = `${PANEL_CLASS}__finance-hub`;
  financeHubEl.hidden = true;

  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const unlockBtn = document.createElement("button");
  unlockBtn.type = "button";
  unlockBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--ghost`;
  dismissBtn.textContent = "Not now";
  actions.append(unlockBtn, dismissBtn);

  body.append(priceCard, tenderEl, walletEl, errorEl, financeHubEl, actions);
  panel.appendChild(body);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let busy = false;
  let current: EducationAccessPanelShowInput | null = null;
  let stickyError: string | null = null;

  const refresh = (): void => {
    if (current === null) return;
    priceLabel.textContent = current.centerLabel;
    priceEl.textContent = `${String(current.apuCost)} APU`;
    priceMeta.textContent =
      current.quoteApw > 0
        ? `or ${formatApw(current.quoteApw)} · UTC day pass`
        : "UTC day pass";
    tenderEl.textContent =
      current.preferredTender === "apu" ? "Paying with APU" : "Paying with APW$";
    walletEl.textContent = `Wallet: ${String(current.powerUps)} APU · ${formatApw(current.balanceUsd)}`;
    unlockBtn.disabled = busy || !current.canAfford;
    unlockBtn.textContent = busy
      ? "Unlocking…"
      : `Unlock ${current.centerLabel} · ${String(current.apuCost)} APU`;
    const showFinanceHub = shouldShowEducationFinanceHubCta({
      canAfford: current.canAfford,
      errorMessage: stickyError,
    });
    if (stickyError !== null && !busy) {
      errorEl.textContent = stickyError;
    } else if (!current.canAfford && !busy) {
      errorEl.textContent =
        current.quoteApw > 0
          ? `Need ${String(current.apuCost)} APU or ${formatApw(current.quoteApw)}`
          : `Need ${String(current.apuCost)} APU`;
    } else if (!busy) {
      errorEl.textContent = "";
    }
    mountEducationFinanceHubCta({
      container: financeHubEl,
      powerUps: current.powerUps,
      visible: showFinanceHub && !busy,
    });
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    busy = false;
    current = null;
    stickyError = null;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  const show = (input: EducationAccessPanelShowInput): void => {
    current = input;
    busy = false;
    stickyError = null;
    isOpen = true;
    errorEl.textContent = "";
    backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
    refresh();
  };

  unlockBtn.addEventListener("click", () => {
    if (current === null || busy || !current.canAfford) return;
    void current.onPurchase();
  });
  dismissBtn.addEventListener("click", () => {
    if (busy) return;
    const dismiss = current?.onDismiss;
    close();
    dismiss?.();
  });

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && isOpen && !busy) {
      const dismiss = current?.onDismiss;
      close();
      dismiss?.();
    }
  };
  document.addEventListener("keydown", onKey);

  return {
    root: backdrop,
    show,
    setBusy: (nextBusy: boolean) => {
      busy = nextBusy;
      refresh();
    },
    setError: (message: string) => {
      stickyError = message;
      errorEl.textContent = message;
      busy = false;
      refresh();
    },
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

export const canAffordEducationDayPass = (input: {
  powerUps: number;
  balanceUsd: number;
  apuCost: number;
  quoteApw: number;
}): boolean => {
  return (
    input.powerUps >= input.apuCost ||
    (input.quoteApw > 0 && input.balanceUsd >= input.quoteApw)
  );
};
