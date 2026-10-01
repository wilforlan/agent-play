/**
 * @packageDocumentation
 * @module @agent-play/play-ui/arcade-access-panel
 *
 * Gamified Maple Ave arcade access gate: day vs weekly pass with dual-tender hint.
 *
 * @public
 */

import type { ArcadeAccessPlan, ArcadeTender } from "./arcade-access-client.js";

const PANEL_CLASS = "preview-arcade-access";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-arcade-access-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed;
  inset: 0;
  z-index: 13300;
  background: rgba(15, 23, 42, 0.62);
  display: none;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(440px, 92%);
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
  padding: 20px 22px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.${PANEL_CLASS}__plans {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.${PANEL_CLASS}__plan {
  text-align: left;
  border: 2px solid rgba(148, 163, 184, 0.45);
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  color: inherit;
}
.${PANEL_CLASS}__plan--selected {
  border-color: #0f766e;
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.25);
  background: #f0fdfa;
}
.${PANEL_CLASS}__plan--featured {
  border-color: rgba(245, 158, 11, 0.55);
}
.${PANEL_CLASS}__plan-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 4px 0;
}
.${PANEL_CLASS}__plan-price {
  font-size: 26px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin: 0;
  color: #0f172a;
}
.${PANEL_CLASS}__plan-meta {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0 0;
}
.${PANEL_CLASS}__badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f59e0b;
  color: #1f2937;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  vertical-align: middle;
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
  background: #0f766e;
  color: #ecfdf5;
}
.${PANEL_CLASS}__btn--primary:hover:not(:disabled) { background: #115e59; }
.${PANEL_CLASS}__btn--ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid rgba(37,99,235,0.35);
}
.${PANEL_CLASS}__btn--ghost:hover { background: rgba(37,99,235,0.08); }
`;
  document.head.appendChild(style);
};

export type ArcadeAccessPanelShowInput = {
  readonly quotes: { readonly day: number; readonly week: number };
  readonly dayApuCost: number;
  readonly weekApuCost: number;
  readonly preferredTender: ArcadeTender;
  readonly balanceUsd: number;
  readonly powerUps: number;
  readonly canAffordDay: boolean;
  readonly canAffordWeek: boolean;
  readonly onPurchase: (plan: ArcadeAccessPlan) => void | Promise<void>;
  readonly onDismiss: () => void;
};

export type ArcadeAccessPanelHandle = {
  readonly root: HTMLElement;
  show(input: ArcadeAccessPanelShowInput): void;
  setBusy(busy: boolean): void;
  setError(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

export type CreateArcadeAccessPanelOptions = {
  readonly parent: HTMLElement;
};

const formatApw = (amount: number): string =>
  `APW$ ${amount.toFixed(2)}`;

/**
 * Create the arcade zone access gate panel.
 *
 * @public
 */
export const createArcadeAccessPanel = (
  options: CreateArcadeAccessPanelOptions
): ArcadeAccessPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Arcade access");

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);

  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  title.textContent = "Maple Ave · Arcade Access";
  const subtitle = document.createElement("p");
  subtitle.className = `${PANEL_CLASS}__subtitle`;
  subtitle.textContent = "Insert credit to play the cabinets.";
  header.append(title, subtitle);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const plans = document.createElement("div");
  plans.className = `${PANEL_CLASS}__plans`;
  const dayBtn = document.createElement("button");
  dayBtn.type = "button";
  dayBtn.className = `${PANEL_CLASS}__plan`;
  dayBtn.dataset.plan = "day";
  const weekBtn = document.createElement("button");
  weekBtn.type = "button";
  weekBtn.className = `${PANEL_CLASS}__plan ${PANEL_CLASS}__plan--featured`;
  weekBtn.dataset.plan = "week";
  plans.append(dayBtn, weekBtn);

  const tenderEl = document.createElement("p");
  tenderEl.className = `${PANEL_CLASS}__tender`;
  const walletEl = document.createElement("p");
  walletEl.className = `${PANEL_CLASS}__wallet`;
  const errorEl = document.createElement("p");
  errorEl.className = `${PANEL_CLASS}__error`;

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

  body.append(plans, tenderEl, walletEl, errorEl, actions);
  panel.appendChild(body);
  options.parent.appendChild(backdrop);

  let isOpen = false;
  let busy = false;
  let selected: ArcadeAccessPlan = "week";
  let current: ArcadeAccessPanelShowInput | null = null;

  const renderPlanCard = (
    btn: HTMLButtonElement,
    plan: ArcadeAccessPlan,
    input: ArcadeAccessPanelShowInput
  ): void => {
    const isWeek = plan === "week";
    const price = isWeek ? input.quotes.week : input.quotes.day;
    const apu = isWeek ? input.weekApuCost : input.dayApuCost;
    const selectedClass =
      selected === plan ? ` ${PANEL_CLASS}__plan--selected` : "";
    const featured = isWeek ? ` ${PANEL_CLASS}__plan--featured` : "";
    btn.className = `${PANEL_CLASS}__plan${featured}${selectedClass}`;
    btn.innerHTML = "";
    const label = document.createElement("p");
    label.className = `${PANEL_CLASS}__plan-label`;
    label.textContent = isWeek ? "Weekly pass" : "24-hour pass";
    if (isWeek) {
      const badge = document.createElement("span");
      badge.className = `${PANEL_CLASS}__badge`;
      badge.textContent = "Save 20%";
      label.appendChild(badge);
    }
    const priceEl = document.createElement("p");
    priceEl.className = `${PANEL_CLASS}__plan-price`;
    priceEl.textContent = formatApw(price);
    const meta = document.createElement("p");
    meta.className = `${PANEL_CLASS}__plan-meta`;
    meta.textContent = isWeek
      ? `${String(apu)} APU · 7 days · ~${formatApw(price / 7)} / day`
      : `${String(apu)} APU · unlock Maple Ave for a day`;
    btn.append(label, priceEl, meta);
  };

  const refresh = (): void => {
    if (current === null) return;
    renderPlanCard(dayBtn, "day", current);
    renderPlanCard(weekBtn, "week", current);
    const tenderLabel =
      current.preferredTender === "apu" ? "Paying with APU" : "Paying with APW$";
    tenderEl.textContent = tenderLabel;
    walletEl.textContent = `Wallet: ${String(current.powerUps)} APU · ${formatApw(current.balanceUsd)}`;
    const canAfford =
      selected === "day" ? current.canAffordDay : current.canAffordWeek;
    unlockBtn.disabled = busy || !canAfford;
    unlockBtn.textContent = busy
      ? "Unlocking…"
      : selected === "week"
        ? `Unlock weekly · ${formatApw(current.quotes.week)}`
        : `Unlock 24h · ${formatApw(current.quotes.day)}`;
    if (!canAfford && !busy) {
      errorEl.textContent = `Need ${formatApw(
        selected === "week" ? current.quotes.week : current.quotes.day
      )} or ${String(
        selected === "week" ? current.weekApuCost : current.dayApuCost
      )} APU`;
    } else if (!busy) {
      errorEl.textContent = "";
    }
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    busy = false;
    current = null;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  const show = (input: ArcadeAccessPanelShowInput): void => {
    current = input;
    selected = "week";
    busy = false;
    isOpen = true;
    errorEl.textContent = "";
    backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
    refresh();
  };

  dayBtn.addEventListener("click", () => {
    selected = "day";
    refresh();
  });
  weekBtn.addEventListener("click", () => {
    selected = "week";
    refresh();
  });
  unlockBtn.addEventListener("click", () => {
    if (current === null || busy) return;
    const canAfford =
      selected === "day" ? current.canAffordDay : current.canAffordWeek;
    if (!canAfford) return;
    void current.onPurchase(selected);
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

export const canAffordArcadePlan = (input: {
  plan: ArcadeAccessPlan;
  powerUps: number;
  balanceUsd: number;
  dayApuCost: number;
  weekApuCost: number;
  quotes: { day: number; week: number };
}): boolean => {
  const apuCost = input.plan === "day" ? input.dayApuCost : input.weekApuCost;
  const apwCost = input.plan === "day" ? input.quotes.day : input.quotes.week;
  return input.powerUps >= apuCost || (apwCost > 0 && input.balanceUsd >= apwCost);
};
