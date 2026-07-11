import {
  DEFAULT_PARKING_RATES_USD,
  PARKING_DURATION_TIERS,
  type ParkingDurationTier,
} from "@agent-play/sdk/browser";

export type ParkingCarOption = {
  purchaseId: string;
  label: string;
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
  hide(): void;
  setBusy(): void;
  setError(message: string): void;
  isOpen(): boolean;
  isBusy(): boolean;
  destroy(): void;
};

const STYLE_ID = "preview-parking-ticket-tooltip-styles";

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
`;
  document.head.appendChild(style);
};

export const createParkingTicketTooltip = (): ParkingTicketTooltipHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "preview-parking-ticket-tooltip";
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
  root.append(blocked, error, nickLabel, nickInput, carLabel, carSelect, tierLabel, tierSelect, buyBtn);
  document.body.appendChild(root);

  let busy = false;
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

  return {
    root,
    show(input) {
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
    hide() {
      root.classList.remove("preview-parking-ticket-tooltip--open");
      busy = false;
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy ticket";
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
    destroy() {
      root.remove();
    },
  };
};
