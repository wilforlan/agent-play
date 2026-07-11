import {
  DEFAULT_PARKING_RATES_USD,
  PARKING_DURATION_TIERS,
  type ParkingDurationTier,
} from "@agent-play/sdk/browser";

export type ParkingCarOption = {
  purchaseId: string;
  label: string;
};

export type ParkingSpotInspectDetails = {
  bay: number;
  layer: number;
  displayNick: string;
  model: string;
  colorHex: string;
  tier: ParkingDurationTier;
  purchasedAt: string;
  expiresAt: string | null;
  costUsd: number;
};

export type ParkingTicketTooltipHandle = {
  readonly root: HTMLElement;
  show(input: {
    cars: ReadonlyArray<ParkingCarOption>;
    ownershipBlocked?: string;
    onBuy: (input: {
      carPurchaseId: string;
      durationTier: ParkingDurationTier;
      displayNick: string;
    }) => void;
  }): void;
  showLoading(): void;
  showInspect(details: ParkingSpotInspectDetails): void;
  hide(): void;
  setBusy(): void;
  setError(message: string): void;
  isOpen(): boolean;
  isBusy(): boolean;
  isInspectMode(): boolean;
  destroy(): void;
};

const STYLE_ID = "preview-parking-ticket-tooltip-styles";

const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`;

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const ensureStyles = (): void => {
  if (document.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.preview-parking-ticket-tooltip {
  position: fixed;
  z-index: 12000;
  min-width: 220px;
  max-width: 280px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.96);
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  display: none;
}
.preview-parking-ticket-tooltip--open { display: block; }
.preview-parking-ticket-tooltip label {
  display: block;
  font-size: 11px;
  margin-bottom: 4px;
  color: #94a3b8;
}
.preview-parking-ticket-tooltip input,
.preview-parking-ticket-tooltip select {
  width: 100%;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.9);
  color: #f8fafc;
  font-size: 13px;
}
.preview-parking-ticket-tooltip button {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.preview-parking-ticket-tooltip button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.preview-parking-ticket-tooltip__error {
  color: #fca5a5;
  font-size: 12px;
  margin-bottom: 8px;
}
.preview-parking-ticket-tooltip__blocked {
  color: #fcd34d;
  font-size: 12px;
  margin-bottom: 8px;
}
.preview-parking-ticket-tooltip__inspect {
  display: none;
  font-size: 13px;
  line-height: 1.45;
}
.preview-parking-ticket-tooltip__inspect--open {
  display: block;
}
.preview-parking-ticket-tooltip__inspect-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}
.preview-parking-ticket-tooltip__inspect-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.preview-parking-ticket-tooltip__inspect-label {
  color: #94a3b8;
  font-size: 11px;
}
.preview-parking-ticket-tooltip__inspect-value {
  text-align: right;
}
.preview-parking-ticket-tooltip__inspect-car {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.preview-parking-ticket-tooltip__inspect-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
}
.preview-parking-ticket-tooltip__inspect-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  color: #cbd5e1;
  font-size: 12px;
}
.preview-parking-ticket-tooltip__buy {
  display: block;
}
.preview-parking-ticket-tooltip__buy--hidden {
  display: none;
}
.preview-parking-ticket-tooltip__loading {
  display: none;
  font-size: 13px;
  color: #cbd5e1;
  text-align: center;
  padding: 8px 0;
}
.preview-parking-ticket-tooltip__loading--open {
  display: block;
}
.preview-parking-ticket-tooltip__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: preview-parking-spin 0.8s linear infinite;
  vertical-align: -2px;
  margin-right: 6px;
}
@keyframes preview-parking-spin {
  to { transform: rotate(360deg); }
}
`;
  document.head.appendChild(style);
};

const appendInspectRow = (input: {
  parent: HTMLElement;
  label: string;
  value: string;
}): void => {
  const row = document.createElement("div");
  row.className = "preview-parking-ticket-tooltip__inspect-row";
  const label = document.createElement("span");
  label.className = "preview-parking-ticket-tooltip__inspect-label";
  label.textContent = input.label;
  const value = document.createElement("span");
  value.className = "preview-parking-ticket-tooltip__inspect-value";
  value.textContent = input.value;
  row.append(label, value);
  input.parent.appendChild(row);
};

export const createParkingTicketTooltip = (): ParkingTicketTooltipHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "preview-parking-ticket-tooltip";
  const buySection = document.createElement("div");
  buySection.className = "preview-parking-ticket-tooltip__buy";
  const blocked = document.createElement("div");
  blocked.className = "preview-parking-ticket-tooltip__blocked";
  blocked.hidden = true;
  const error = document.createElement("div");
  error.className = "preview-parking-ticket-tooltip__error";
  error.hidden = true;
  const nickLabel = document.createElement("label");
  nickLabel.textContent = "Display nick";
  const nickInput = document.createElement("input");
  nickInput.type = "text";
  nickInput.maxLength = 24;
  nickInput.placeholder = "e.g. Red Coupe";
  const carLabel = document.createElement("label");
  carLabel.textContent = "Your car";
  const carSelect = document.createElement("select");
  const tierLabel = document.createElement("label");
  tierLabel.textContent = "Duration";
  const tierSelect = document.createElement("select");
  for (const tier of PARKING_DURATION_TIERS) {
    const opt = document.createElement("option");
    opt.value = tier;
    opt.textContent = `${tier} — $${DEFAULT_PARKING_RATES_USD[tier].toFixed(2)}`;
    tierSelect.appendChild(opt);
  }
  const buyBtn = document.createElement("button");
  buyBtn.type = "button";
  buyBtn.textContent = "Buy ticket";
  buySection.append(
    blocked,
    error,
    nickLabel,
    nickInput,
    carLabel,
    carSelect,
    tierLabel,
    tierSelect,
    buyBtn
  );

  const inspectSection = document.createElement("div");
  inspectSection.className = "preview-parking-ticket-tooltip__inspect";
  const inspectTitle = document.createElement("div");
  inspectTitle.className = "preview-parking-ticket-tooltip__inspect-title";
  const inspectBody = document.createElement("div");
  const inspectFooter = document.createElement("div");
  inspectFooter.className = "preview-parking-ticket-tooltip__inspect-footer";
  inspectSection.append(inspectTitle, inspectBody, inspectFooter);

  const loadingSection = document.createElement("div");
  loadingSection.className = "preview-parking-ticket-tooltip__loading";
  loadingSection.innerHTML =
    '<span class="preview-parking-ticket-tooltip__spinner"></span>Loading cars…';

  root.append(buySection, inspectSection, loadingSection);
  document.body.appendChild(root);

  let busy = false;
  let inspectMode = false;
  let onBuy:
    | ((input: {
        carPurchaseId: string;
        durationTier: ParkingDurationTier;
        displayNick: string;
      }) => void)
    | null = null;

  buyBtn.addEventListener("click", () => {
    if (busy || onBuy === null) {
      return;
    }
    const nick = nickInput.value.trim();
    const carPurchaseId = carSelect.value;
    const tier = tierSelect.value as ParkingDurationTier;
    if (nick.length === 0 || carPurchaseId.length === 0) {
      error.textContent = "Enter a nick and pick a car.";
      error.hidden = false;
      return;
    }
    onBuy({ carPurchaseId, durationTier: tier, displayNick: nick });
  });

  const setBuyVisible = (visible: boolean): void => {
    buySection.classList.toggle(
      "preview-parking-ticket-tooltip__buy--hidden",
      !visible
    );
    inspectSection.classList.toggle(
      "preview-parking-ticket-tooltip__inspect--open",
      !visible
    );
    loadingSection.classList.remove("preview-parking-ticket-tooltip__loading--open");
    inspectMode = !visible;
  };

  const setLoadingVisible = (visible: boolean): void => {
    buySection.classList.toggle(
      "preview-parking-ticket-tooltip__buy--hidden",
      visible
    );
    inspectSection.classList.toggle(
      "preview-parking-ticket-tooltip__inspect--open",
      false
    );
    loadingSection.classList.toggle(
      "preview-parking-ticket-tooltip__loading--open",
      visible
    );
    inspectMode = false;
    if (visible) {
      onBuy = null;
    }
  };

  return {
    root,
    show(input) {
      setLoadingVisible(false);
      setBuyVisible(true);
      error.hidden = true;
      blocked.hidden = input.ownershipBlocked === undefined;
      if (input.ownershipBlocked !== undefined) {
        blocked.textContent = input.ownershipBlocked;
      }
      carSelect.replaceChildren();
      for (const car of input.cars) {
        const opt = document.createElement("option");
        opt.value = car.purchaseId;
        opt.textContent = car.label;
        carSelect.appendChild(opt);
      }
      onBuy = input.onBuy;
      buyBtn.disabled =
        input.cars.length === 0 || input.ownershipBlocked !== undefined;
      root.classList.add("preview-parking-ticket-tooltip--open");
    },
    showLoading() {
      error.hidden = true;
      blocked.hidden = true;
      setLoadingVisible(true);
      root.classList.add("preview-parking-ticket-tooltip--open");
    },
    showInspect(details) {
      setLoadingVisible(false);
      setBuyVisible(false);
      onBuy = null;
      inspectTitle.textContent = `Bay ${String(details.bay)} · layer ${String(details.layer)}`;
      inspectBody.replaceChildren();

      appendInspectRow({
        parent: inspectBody,
        label: "Owner",
        value: details.displayNick,
      });

      const carRow = document.createElement("div");
      carRow.className = "preview-parking-ticket-tooltip__inspect-row";
      const carLabelEl = document.createElement("span");
      carLabelEl.className = "preview-parking-ticket-tooltip__inspect-label";
      carLabelEl.textContent = "Car";
      const carValue = document.createElement("span");
      carValue.className =
        "preview-parking-ticket-tooltip__inspect-value preview-parking-ticket-tooltip__inspect-car";
      const swatch = document.createElement("span");
      swatch.className = "preview-parking-ticket-tooltip__inspect-swatch";
      swatch.style.backgroundColor = details.colorHex;
      const carName = document.createElement("span");
      carName.textContent = details.model;
      carValue.append(swatch, carName);
      carRow.append(carLabelEl, carValue);
      inspectBody.appendChild(carRow);

      appendInspectRow({
        parent: inspectBody,
        label: "Purchased",
        value: formatTimestamp(details.purchasedAt),
      });
      appendInspectRow({
        parent: inspectBody,
        label: "Duration",
        value: details.tier,
      });
      appendInspectRow({
        parent: inspectBody,
        label: "Expires",
        value:
          details.expiresAt === null
            ? "Never"
            : formatTimestamp(details.expiresAt),
      });
      appendInspectRow({
        parent: inspectBody,
        label: "Ticket cost",
        value: formatUsd(details.costUsd),
      });

      inspectFooter.textContent =
        details.tier === "forever"
          ? "Forever ticket — this spot is not available for purchase."
          : details.expiresAt === null
            ? "This spot is currently occupied."
            : `Available when the ticket expires (${formatTimestamp(details.expiresAt)}).`;

      root.classList.add("preview-parking-ticket-tooltip--open");
    },
    hide() {
      root.classList.remove("preview-parking-ticket-tooltip--open");
      busy = false;
      inspectMode = false;
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy ticket";
      setLoadingVisible(false);
      setBuyVisible(true);
    },
    setBusy() {
      busy = true;
      buyBtn.disabled = true;
      buyBtn.textContent = "Buying…";
    },
    setError(message) {
      busy = false;
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy ticket";
      error.textContent = message;
      error.hidden = false;
    },
    isOpen() {
      return root.classList.contains("preview-parking-ticket-tooltip--open");
    },
    isBusy() {
      return busy;
    },
    isInspectMode() {
      return inspectMode;
    },
    destroy() {
      root.remove();
    },
  };
};
