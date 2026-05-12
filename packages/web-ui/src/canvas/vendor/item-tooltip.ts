/**
 * @packageDocumentation
 * @module @agent-play/play-ui/item-tooltip
 *
 * Floating DOM tooltip used by every amenity stage. Renders the focused
 * item's name, description, price, and either a `Buy` button (when
 * `sale.status === 'available'`) or a disabled `SOLD` pill (when the item
 * has been sold).
 *
 * The tooltip is intentionally framework-free DOM: it is positioned by the
 * host using canvas-relative coordinates and disposed when the player
 * walks away or presses `P` to close.
 *
 * @see ./amenity-shop-stage.ts, ./amenity-supermarket-stage.ts,
 *      ./amenity-carwash-stage.ts — the three consumers.
 */

/**
 * Information rendered in the tooltip body.
 *
 * @public
 */
export type ItemTooltipModel = {
  readonly name: string;
  readonly description?: string;
  readonly priceUsd: number;
  readonly sale: { status: "available" | "sold"; soldToPlayerId?: string };
};

/**
 * Handle returned by {@link createItemTooltip}.
 *
 * @public
 */
export type ItemTooltipHandle = {
  readonly root: HTMLElement;
  show(input: { model: ItemTooltipModel; onBuy: () => void }): void;
  hide(): void;
  setError(message: string): void;
  setBusy(): void;
  destroy(): void;
};

const TOOLTIP_CLASS = "preview-item-tooltip";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-item-tooltip-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${TOOLTIP_CLASS} {
  position: absolute;
  z-index: 40;
  min-width: 220px;
  max-width: 280px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 252, 244, 0.98);
  color: #1f2937;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 12px 36px rgba(15,23,42,0.22);
  border: 1px solid rgba(15,23,42,0.08);
  display: none;
}
.${TOOLTIP_CLASS}--open { display: block; }
.${TOOLTIP_CLASS}__name { font-weight: 800; margin-bottom: 4px; font-size: 14px; }
.${TOOLTIP_CLASS}__desc { color: #475569; margin-bottom: 8px; font-size: 12px; }
.${TOOLTIP_CLASS}__price { font-family: ui-monospace, Menlo, monospace; margin-bottom: 8px; }
.${TOOLTIP_CLASS}__buy {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 999px;
  background: #2d8a52;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.${TOOLTIP_CLASS}__buy:disabled { background: #94a3b8; cursor: not-allowed; }
.${TOOLTIP_CLASS}__sold {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  background: #94a3b8;
  color: #fff;
  font-weight: 800;
  letter-spacing: 2px;
  text-align: center;
}
.${TOOLTIP_CLASS}__buyer { font-size: 11px; color: #64748b; margin-top: 6px; }
.${TOOLTIP_CLASS}__error { color: #b91c1c; font-size: 11px; margin-top: 6px; }
`;
  document.head.appendChild(style);
};

const formatUsd = (price: number): string =>
  `$${(Math.round(price * 100) / 100).toFixed(2)}`;

/**
 * Mount the tooltip inside the supplied parent.
 *
 * @public
 */
export const createItemTooltip = (options: {
  parent: HTMLElement;
}): ItemTooltipHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = TOOLTIP_CLASS;
  options.parent.appendChild(root);

  let currentBuyHandler: (() => void) | null = null;
  let isBusy = false;

  const render = (model: ItemTooltipModel): void => {
    root.innerHTML = "";

    const name = document.createElement("div");
    name.className = `${TOOLTIP_CLASS}__name`;
    name.textContent = model.name;
    root.appendChild(name);

    if (
      typeof model.description === "string" &&
      model.description.length > 0
    ) {
      const desc = document.createElement("div");
      desc.className = `${TOOLTIP_CLASS}__desc`;
      desc.textContent = model.description;
      root.appendChild(desc);
    }

    const price = document.createElement("div");
    price.className = `${TOOLTIP_CLASS}__price`;
    if (model.sale.status === "sold") {
      price.textContent = `Sold (${formatUsd(model.priceUsd)})`;
      price.style.color = "#94a3b8";
    } else {
      price.textContent = formatUsd(model.priceUsd);
    }
    root.appendChild(price);

    if (model.sale.status === "sold") {
      const pill = document.createElement("div");
      pill.className = `${TOOLTIP_CLASS}__sold`;
      pill.textContent = "SOLD";
      root.appendChild(pill);
      if (
        typeof model.sale.soldToPlayerId === "string" &&
        model.sale.soldToPlayerId.length > 0
      ) {
        const buyer = document.createElement("div");
        buyer.className = `${TOOLTIP_CLASS}__buyer`;
        buyer.textContent = `Bought by ${model.sale.soldToPlayerId}`;
        root.appendChild(buyer);
      }
    } else {
      const buy = document.createElement("button");
      buy.className = `${TOOLTIP_CLASS}__buy`;
      buy.type = "button";
      buy.textContent = `Buy · ${formatUsd(model.priceUsd)}`;
      buy.disabled = isBusy;
      buy.addEventListener("click", () => {
        if (currentBuyHandler !== null) currentBuyHandler();
      });
      root.appendChild(buy);
    }
  };

  return {
    root,
    show: ({ model, onBuy }) => {
      isBusy = false;
      currentBuyHandler = onBuy;
      render(model);
      root.classList.add(`${TOOLTIP_CLASS}--open`);
    },
    hide: () => {
      root.classList.remove(`${TOOLTIP_CLASS}--open`);
      currentBuyHandler = null;
    },
    setBusy: () => {
      isBusy = true;
      const button = root.querySelector<HTMLButtonElement>(
        `.${TOOLTIP_CLASS}__buy`
      );
      if (button !== null) button.disabled = true;
    },
    setError: (message: string) => {
      const existing = root.querySelector(`.${TOOLTIP_CLASS}__error`);
      if (existing !== null) existing.remove();
      const err = document.createElement("div");
      err.className = `${TOOLTIP_CLASS}__error`;
      err.textContent = message;
      root.appendChild(err);
    },
    destroy: () => {
      if (root.parentElement === options.parent) {
        options.parent.removeChild(root);
      }
    },
  };
};
