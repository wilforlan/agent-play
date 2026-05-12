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
  /**
   * Place the tooltip near an anchor point given in **viewport
   * coordinates** (`getBoundingClientRect()` space). The tooltip will
   * try to render above the anchor, but flips below if it would
   * overflow the top of the viewport, and clamps horizontally so the
   * full content is always visible. Safe to call before `show()`.
   *
   * @param anchor - the viewport (px) point the tooltip should
   *   pivot around — typically the screen-space top of the player or
   *   item sprite.
   * @param options.gapPx - distance between the anchor and the closest
   *   tooltip edge. Defaults to `12`.
   * @param options.marginPx - minimum gap to keep between the tooltip
   *   and the viewport edge. Defaults to `8`.
   */
  position(
    anchor: { x: number; y: number },
    options?: { gapPx?: number; marginPx?: number }
  ): void;
  /** Whether the tooltip currently has the open modifier applied. */
  isOpen(): boolean;
  /**
   * Whether the tooltip is currently in the in-flight purchase state
   * (the Buy button is rendered with a spinner). The keyboard cycle
   * uses this to suppress retries until the network round-trip
   * finishes.
   */
  isBusy(): boolean;
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
  position: fixed;
  z-index: 12900;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 999px;
  background: #2d8a52;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease;
}
.${TOOLTIP_CLASS}__buy:hover:not(:disabled) { background: #246b40; }
.${TOOLTIP_CLASS}__buy:disabled { background: #94a3b8; cursor: not-allowed; }
.${TOOLTIP_CLASS}__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: preview-item-tooltip-spin 700ms linear infinite;
}
@keyframes preview-item-tooltip-spin {
  to { transform: rotate(360deg); }
}
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
  let currentModel: ItemTooltipModel | null = null;

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
      buy.disabled = isBusy;
      if (isBusy) {
        const spinner = document.createElement("span");
        spinner.className = `${TOOLTIP_CLASS}__spinner`;
        spinner.setAttribute("aria-hidden", "true");
        buy.appendChild(spinner);
        const label = document.createElement("span");
        label.textContent = "Processing…";
        buy.appendChild(label);
      } else {
        buy.textContent = `Buy · ${formatUsd(model.priceUsd)}`;
      }
      buy.addEventListener("click", () => {
        if (buy.disabled) return;
        if (currentBuyHandler !== null) currentBuyHandler();
      });
      root.appendChild(buy);
    }
  };

  const placeAround = (
    anchor: { x: number; y: number },
    opts: { gapPx?: number; marginPx?: number } = {}
  ): void => {
    const gap = opts.gapPx ?? 12;
    const margin = opts.marginPx ?? 8;
    const viewportW =
      typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportH =
      typeof window === "undefined" ? 768 : window.innerHeight;
    // The tooltip must be measurable, so we briefly make it visible if
    // it isn't already. We restore the prior state afterwards.
    const wasOpen = root.classList.contains(`${TOOLTIP_CLASS}--open`);
    const priorLeft = root.style.left;
    const priorTop = root.style.top;
    const priorVisibility = root.style.visibility;
    if (!wasOpen) {
      root.style.visibility = "hidden";
      root.classList.add(`${TOOLTIP_CLASS}--open`);
    }
    // Measure with a known anchor at top-left so the rect reflects only
    // the tooltip's intrinsic size, not previous placement.
    root.style.left = "0px";
    root.style.top = "0px";
    const rect = root.getBoundingClientRect();
    const tooltipW = rect.width;
    const tooltipH = rect.height;
    // Default: place above the anchor, centered horizontally.
    let left = anchor.x - tooltipW / 2;
    let top = anchor.y - tooltipH - gap;
    // Vertical flip when the tooltip would overflow the top of the viewport.
    if (top < margin) {
      const below = anchor.y + gap;
      // Only flip if the below position fits better.
      if (below + tooltipH <= viewportH - margin || below > top) {
        top = below;
      }
    }
    // Final vertical clamp (handles edge cases like very tall tooltips
    // or short viewports).
    if (top + tooltipH > viewportH - margin) {
      top = Math.max(margin, viewportH - tooltipH - margin);
    }
    if (top < margin) top = margin;
    // Horizontal clamp.
    if (left < margin) left = margin;
    if (left + tooltipW > viewportW - margin) {
      left = Math.max(margin, viewportW - tooltipW - margin);
    }
    root.style.left = `${String(Math.round(left))}px`;
    root.style.top = `${String(Math.round(top))}px`;
    if (!wasOpen) {
      root.classList.remove(`${TOOLTIP_CLASS}--open`);
      root.style.visibility = priorVisibility;
      // Restore prior coords too so closing/reopening starts from a
      // clean slate.
      root.style.left = priorLeft;
      root.style.top = priorTop;
    }
  };

  return {
    root,
    show: ({ model, onBuy }) => {
      isBusy = false;
      currentBuyHandler = onBuy;
      currentModel = model;
      render(model);
      root.classList.add(`${TOOLTIP_CLASS}--open`);
    },
    hide: () => {
      root.classList.remove(`${TOOLTIP_CLASS}--open`);
      currentBuyHandler = null;
      currentModel = null;
      isBusy = false;
    },
    setBusy: () => {
      isBusy = true;
      if (currentModel !== null) render(currentModel);
    },
    setError: (message: string) => {
      isBusy = false;
      if (currentModel !== null) render(currentModel);
      const err = document.createElement("div");
      err.className = `${TOOLTIP_CLASS}__error`;
      err.textContent = message;
      root.appendChild(err);
    },
    position: (anchor, posOptions) => placeAround(anchor, posOptions ?? {}),
    isOpen: () => root.classList.contains(`${TOOLTIP_CLASS}--open`),
    isBusy: () => isBusy,
    destroy: () => {
      if (root.parentElement === options.parent) {
        options.parent.removeChild(root);
      }
    },
  };
};
