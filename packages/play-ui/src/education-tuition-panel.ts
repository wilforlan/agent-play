/**
 * Annual school-fees confirmation panel (dual tender).
 */

import type { EducationTender } from "./education-tuition-client.js";

const PANEL_CLASS = "preview-education-tuition";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-education-tuition-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed; inset: 0; z-index: 13330;
  background: rgba(15, 23, 42, 0.62);
  display: none; align-items: center; justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(420px, 92%); background: #f7faf5; color: #1f2937;
  font-family: system-ui, sans-serif; border-radius: 20px;
  box-shadow: 0 24px 70px rgba(15,23,42,0.42); overflow: hidden;
}
.${PANEL_CLASS}__header {
  padding: 18px 22px 14px; text-align: center;
  background: linear-gradient(135deg, #14532d, #166534); color: #f0fdf4;
}
.${PANEL_CLASS}__title { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
.${PANEL_CLASS}__subtitle { margin: 0; font-size: 12px; color: #bbf7d0; }
.${PANEL_CLASS}__body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 10px; }
.${PANEL_CLASS}__price {
  margin: 0; text-align: center; font-size: 28px; font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #14532d;
}
.${PANEL_CLASS}__meta, .${PANEL_CLASS}__tender, .${PANEL_CLASS}__wallet {
  margin: 0; text-align: center; font-size: 12px; color: #64748b;
}
.${PANEL_CLASS}__error { margin: 0; min-height: 1.2em; text-align: center; font-size: 12px; color: #b91c1c; }
.${PANEL_CLASS}__actions { display: flex; flex-direction: column; gap: 8px; }
.${PANEL_CLASS}__btn {
  border: none; padding: 11px 16px; border-radius: 999px; font-weight: 700; font-size: 14px; cursor: pointer;
}
.${PANEL_CLASS}__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.${PANEL_CLASS}__btn--primary { background: #166534; color: #ecfdf5; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent; color: #2563eb; border: 1px solid rgba(37,99,235,0.35);
}
`;
  document.head.appendChild(style);
};

export type EducationTuitionPanelShowInput = {
  readonly facultyLabel: string;
  readonly pathTitle: string;
  readonly quoteApw: number;
  readonly apuCost: number;
  readonly preferredTender: EducationTender;
  readonly balanceUsd: number;
  readonly powerUps: number;
  readonly canAfford: boolean;
  readonly onPurchase: () => void | Promise<void>;
  readonly onDismiss: () => void;
};

export type EducationTuitionPanelHandle = {
  show(input: EducationTuitionPanelShowInput): void;
  setBusy(busy: boolean): void;
  setError(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

export const canAffordEducationTuition = (input: {
  powerUps: number;
  balanceUsd: number;
  apuCost: number;
  quoteApw: number;
}): boolean =>
  input.powerUps >= input.apuCost ||
  (input.quoteApw > 0 && input.balanceUsd >= input.quoteApw);

export const createEducationTuitionPanel = (options: {
  parent: HTMLElement;
}): EducationTuitionPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);
  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  title.textContent = "Annual school fees";
  const subtitle = document.createElement("p");
  subtitle.className = `${PANEL_CLASS}__subtitle`;
  header.append(title, subtitle);
  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const price = document.createElement("p");
  price.className = `${PANEL_CLASS}__price`;
  const meta = document.createElement("p");
  meta.className = `${PANEL_CLASS}__meta`;
  const tender = document.createElement("p");
  tender.className = `${PANEL_CLASS}__tender`;
  const wallet = document.createElement("p");
  wallet.className = `${PANEL_CLASS}__wallet`;
  const errorEl = document.createElement("p");
  errorEl.className = `${PANEL_CLASS}__error`;
  const actions = document.createElement("div");
  actions.className = `${PANEL_CLASS}__actions`;
  const payBtn = document.createElement("button");
  payBtn.type = "button";
  payBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--primary`;
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = `${PANEL_CLASS}__btn ${PANEL_CLASS}__btn--ghost`;
  dismissBtn.textContent = "Not now";
  actions.append(payBtn, dismissBtn);
  body.append(price, meta, tender, wallet, errorEl, actions);
  panel.append(header, body);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let busy = false;
  let current: EducationTuitionPanelShowInput | null = null;

  const refresh = (): void => {
    if (current === null) return;
    subtitle.textContent = `${current.facultyLabel} · ${current.pathTitle}`;
    price.textContent = `APW$ ${current.quoteApw.toFixed(2)}`;
    meta.textContent = `or ${String(current.apuCost)} APU · valid 365 days`;
    tender.textContent =
      current.preferredTender === "apu" ? "Paying with APU" : "Paying with APW$";
    wallet.textContent = `Wallet: ${String(current.powerUps)} APU · APW$ ${current.balanceUsd.toFixed(2)}`;
    payBtn.disabled = busy || !current.canAfford;
    payBtn.textContent = busy ? "Paying…" : "Pay school fees";
    if (!current.canAfford && !busy) {
      errorEl.textContent = `Need APW$ ${current.quoteApw.toFixed(2)} or ${String(current.apuCost)} APU`;
    } else if (!busy) {
      errorEl.textContent = "";
    }
  };

  const close = (): void => {
    isOpen = false;
    busy = false;
    current = null;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  payBtn.addEventListener("click", () => {
    if (current === null || busy || !current.canAfford) return;
    void current.onPurchase();
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
