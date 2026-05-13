/**
 * @packageDocumentation
 * @module @agent-play/play-ui/wallet-inventory-panel
 *
 * DOM modal that the player opens by clicking the wallet HUD. Shows
 * their balance, the list of purchased items (newest first), and a
 * detail view for the selected purchase with an "Open" button that
 * expands a full-size preview card. Closed via ✕, click-outside, or
 * Escape.
 *
 * This panel is intentionally framework-free DOM (matches the rest of
 * `play-ui` overlays) and gets its data from {@link ./wallet-purchases-client.ts}.
 *
 * @public
 */

import type { PurchaseRecordDto } from "./wallet-purchases-client.js";
import { buildPurchaseItemKey } from "./wallet-purchases-client.js";
import { createWalletDisplayStrip } from "./wallet-display-strip.js";

/**
 * Minimal shape of an item payload as returned by the `listPurchases`
 * RPC's `items` dictionary. We accept `unknown` and pick fields
 * defensively so older / partial server payloads don't crash the
 * renderer.
 *
 * @public
 */
export type InventoryItemFields = {
  name?: string;
  model?: string;
  year?: number;
  colorHex?: string;
  type?: string;
  description?: string;
};

/**
 * Handle returned by {@link createWalletInventoryPanel}.
 *
 * @public
 */
export type WalletInventoryPanelHandle = {
  readonly root: HTMLElement;
  /** Open the panel and trigger a refresh. */
  open(): void;
  /** Hide the panel. */
  close(): void;
  /** Whether the panel is currently visible. */
  isOpen(): boolean;
  /** Replace the panel's data. */
  setData(input: {
    balanceUsd: number;
    powerUps: number;
    purchases: ReadonlyArray<PurchaseRecordDto>;
    items: Readonly<Record<string, unknown>>;
  }): void;
  /** Show a loading shimmer in place of the list. */
  setLoading(): void;
  /** Show an error message in place of the list. */
  setError(message: string): void;
  destroy(): void;
};

/**
 * Options accepted by {@link createWalletInventoryPanel}.
 *
 * @public
 */
export type CreateWalletInventoryPanelOptions = {
  readonly parent: HTMLElement;
  /**
   * Called when the panel is opened (via API or click) so the host can
   * refresh the data over RPC.
   */
  readonly onRefresh: () => void;
};

const PANEL_CLASS = "preview-wallet-inventory";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-wallet-inventory-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-backdrop {
  position: fixed;
  inset: 0;
  z-index: 13100;
  background: rgba(15, 23, 42, 0.62);
  display: none;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(620px, 92%);
  max-height: 86%;
  background: #fdfbf4;
  color: #1f2937;
  font-family: system-ui, sans-serif;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(15,23,42,0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.${PANEL_CLASS}__header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(15,23,42,0.08);
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #f8fafc;
}
.${PANEL_CLASS}__title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.4px;
}
.${PANEL_CLASS}__balance {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  font-size: 15px;
  color: #fef3c7;
  letter-spacing: 0.5px;
}
.${PANEL_CLASS}__close {
  margin-left: 12px;
  border: none;
  background: rgba(255,255,255,0.12);
  color: #f8fafc;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.${PANEL_CLASS}__close:hover { background: rgba(255,255,255,0.22); }
.${PANEL_CLASS}__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.${PANEL_CLASS}__empty,
.${PANEL_CLASS}__loading,
.${PANEL_CLASS}__error {
  text-align: center;
  padding: 32px 12px;
  color: #475569;
  font-size: 13px;
}
.${PANEL_CLASS}__error { color: #b91c1c; }
.${PANEL_CLASS}__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.${PANEL_CLASS}__row {
  display: grid;
  grid-template-columns: 44px 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(15,23,42,0.08);
  border: 1px solid rgba(15,23,42,0.06);
}
.${PANEL_CLASS}__chip {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #1f2937;
  letter-spacing: 0.5px;
}
.${PANEL_CLASS}__chip--car_wash { background: #cbd5f5; color: #1e293b; }
.${PANEL_CLASS}__chip--shop { background: #fde68a; color: #78350f; }
.${PANEL_CLASS}__chip--supermarket { background: #bbf7d0; color: #064e3b; }
.${PANEL_CLASS}__name { font-weight: 700; font-size: 14px; }
.${PANEL_CLASS}__sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.${PANEL_CLASS}__price {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  font-size: 13px;
}
.${PANEL_CLASS}__open {
  border: none;
  background: #1f2937;
  color: #f8fafc;
  padding: 7px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}
.${PANEL_CLASS}__open:hover { background: #111827; }
.${PANEL_CLASS}__detail {
  padding: 20px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,0.06);
  box-shadow: 0 4px 16px rgba(15,23,42,0.10);
}
.${PANEL_CLASS}__detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}
.${PANEL_CLASS}__back {
  border: none;
  background: transparent;
  color: #2563eb;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 6px;
}
.${PANEL_CLASS}__hero {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  margin: 12px 0 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 22px;
  color: #ffffff;
  letter-spacing: 1px;
}
.${PANEL_CLASS}__meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  font-size: 13px;
  margin-bottom: 16px;
}
.${PANEL_CLASS}__meta-key { color: #64748b; }
.${PANEL_CLASS}__detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
`;
  document.head.appendChild(style);
};

const formatUsd = (price: number): string =>
  `$${(Math.round(price * 100) / 100).toFixed(2)}`;

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AMENITY_LABEL: Record<PurchaseRecordDto["amenityKind"], string> = {
  shop: "Shop",
  supermarket: "Supermarket",
  car_wash: "Car Wash",
};

const pickItemFields = (raw: unknown): InventoryItemFields => {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: InventoryItemFields = {};
  if (typeof r.name === "string") out.name = r.name;
  if (typeof r.model === "string") out.model = r.model;
  if (typeof r.year === "number") out.year = r.year;
  if (typeof r.colorHex === "string") out.colorHex = r.colorHex;
  if (typeof r.type === "string") out.type = r.type;
  if (typeof r.description === "string") out.description = r.description;
  return out;
};

/**
 * Build a one-line subtitle for the purchase row (the bit under the
 * name). Pure and exported so we can test it.
 *
 * @public
 */
export const buildPurchaseSubtitle = (input: {
  record: PurchaseRecordDto;
  fields: InventoryItemFields;
}): string => {
  const at = formatTimestamp(input.record.at);
  if (input.record.amenityKind === "car_wash") {
    const model = input.fields.model ?? "";
    const year =
      typeof input.fields.year === "number" ? String(input.fields.year) : "";
    const left = [model, year].filter((s) => s.length > 0).join(" · ");
    return left.length > 0
      ? `${left} · Bought ${at}`
      : `Bought ${at}`;
  }
  const type = input.fields.type;
  if (typeof type === "string" && type.length > 0) {
    return `${type} · Bought ${at}`;
  }
  return `Bought ${at}`;
};

/**
 * @public
 */
export const createWalletInventoryPanel = (
  options: CreateWalletInventoryPanelOptions
): WalletInventoryPanelHandle => {
  ensureStyles();
  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Wallet inventory");

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  backdrop.appendChild(panel);

  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const titleEl = document.createElement("div");
  titleEl.className = `${PANEL_CLASS}__title`;
  titleEl.textContent = "Wallet & Inventory";
  const headerRight = document.createElement("div");
  headerRight.style.display = "flex";
  headerRight.style.alignItems = "center";
  const headerStrip = createWalletDisplayStrip();
  headerStrip.root.style.color = "#fef3c7";
  headerStrip.root.style.fontSize = "15px";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = `${PANEL_CLASS}__close`;
  closeBtn.setAttribute("aria-label", "Close inventory");
  closeBtn.textContent = "✕";
  headerRight.append(headerStrip.root, closeBtn);
  header.append(titleEl, headerRight);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  panel.appendChild(body);

  options.parent.appendChild(backdrop);

  type ViewState =
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "data";
        balanceUsd: number;
        powerUps: number;
        purchases: ReadonlyArray<PurchaseRecordDto>;
        items: Readonly<Record<string, unknown>>;
        selectedId: string | null;
      };

  let state: ViewState = { kind: "loading" };
  let isOpen = false;

  const renderList = (
    purchases: ReadonlyArray<PurchaseRecordDto>,
    items: Readonly<Record<string, unknown>>
  ): void => {
    body.innerHTML = "";
    if (purchases.length === 0) {
      const empty = document.createElement("div");
      empty.className = `${PANEL_CLASS}__empty`;
      empty.textContent = "You haven't bought anything yet.";
      body.appendChild(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = `${PANEL_CLASS}__list`;
    for (const record of purchases) {
      const key = buildPurchaseItemKey({
        itemRef: record.itemRef,
        spaceId: record.spaceId,
      });
      const fields = pickItemFields(items[key]);
      const row = document.createElement("div");
      row.className = `${PANEL_CLASS}__row`;

      const chip = document.createElement("div");
      chip.className = `${PANEL_CLASS}__chip ${PANEL_CLASS}__chip--${record.amenityKind}`;
      chip.textContent = AMENITY_LABEL[record.amenityKind].slice(0, 2);
      if (
        record.amenityKind === "car_wash" &&
        typeof fields.colorHex === "string"
      ) {
        chip.style.background = fields.colorHex;
        chip.style.color = "#ffffff";
      }
      row.appendChild(chip);

      const nameWrap = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.className = `${PANEL_CLASS}__name`;
      nameEl.textContent =
        fields.name ?? AMENITY_LABEL[record.amenityKind] + " item";
      const subEl = document.createElement("div");
      subEl.className = `${PANEL_CLASS}__sub`;
      subEl.textContent = buildPurchaseSubtitle({ record, fields });
      nameWrap.append(nameEl, subEl);
      row.appendChild(nameWrap);

      const price = document.createElement("div");
      price.className = `${PANEL_CLASS}__price`;
      price.textContent = formatUsd(record.priceUsd);
      row.appendChild(price);

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = `${PANEL_CLASS}__open`;
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => {
        if (state.kind !== "data") return;
        state = { ...state, selectedId: record.id };
        renderCurrent();
      });
      row.appendChild(openBtn);
      list.appendChild(row);
    }
    body.appendChild(list);
  };

  const renderDetail = (
    record: PurchaseRecordDto,
    fields: InventoryItemFields
  ): void => {
    body.innerHTML = "";
    const card = document.createElement("div");
    card.className = `${PANEL_CLASS}__detail`;

    const headerRow = document.createElement("div");
    headerRow.className = `${PANEL_CLASS}__detail-header`;
    const back = document.createElement("button");
    back.type = "button";
    back.className = `${PANEL_CLASS}__back`;
    back.textContent = "← Back to inventory";
    back.addEventListener("click", () => {
      if (state.kind !== "data") return;
      state = { ...state, selectedId: null };
      renderCurrent();
    });
    const name = document.createElement("div");
    name.className = `${PANEL_CLASS}__name`;
    name.style.fontSize = "16px";
    name.textContent =
      fields.name ?? AMENITY_LABEL[record.amenityKind] + " item";
    headerRow.append(back, name);
    card.appendChild(headerRow);

    const hero = document.createElement("div");
    hero.className = `${PANEL_CLASS}__hero`;
    const heroColor =
      record.amenityKind === "car_wash" && typeof fields.colorHex === "string"
        ? fields.colorHex
        : record.amenityKind === "shop"
          ? "#b45309"
          : "#0f766e";
    hero.style.background = heroColor;
    hero.textContent =
      fields.name ??
      AMENITY_LABEL[record.amenityKind].toUpperCase();
    card.appendChild(hero);

    const meta = document.createElement("div");
    meta.className = `${PANEL_CLASS}__meta`;
    const pushMeta = (key: string, value: string): void => {
      const k = document.createElement("div");
      k.className = `${PANEL_CLASS}__meta-key`;
      k.textContent = key;
      const v = document.createElement("div");
      v.textContent = value;
      meta.append(k, v);
    };
    pushMeta("Amenity", AMENITY_LABEL[record.amenityKind]);
    if (record.amenityKind === "car_wash") {
      if (typeof fields.model === "string") pushMeta("Model", fields.model);
      if (typeof fields.year === "number")
        pushMeta("Year", String(fields.year));
    }
    if (typeof fields.type === "string") pushMeta("Kind", fields.type);
    pushMeta("Price paid", formatUsd(record.priceUsd));
    pushMeta("Bought", formatTimestamp(record.at));
    pushMeta("Space", record.spaceId);
    if (typeof fields.description === "string" && fields.description.length > 0)
      pushMeta("Notes", fields.description);
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = `${PANEL_CLASS}__detail-actions`;
    const closeAction = document.createElement("button");
    closeAction.type = "button";
    closeAction.className = `${PANEL_CLASS}__open`;
    closeAction.textContent = "Close";
    closeAction.addEventListener("click", () => close());
    actions.appendChild(closeAction);
    card.appendChild(actions);

    body.appendChild(card);
  };

  const renderCurrent = (): void => {
    if (state.kind === "loading") {
      headerStrip.setBalanceLoading();
      headerStrip.setPowerUpsLoading();
      body.innerHTML = "";
      const loading = document.createElement("div");
      loading.className = `${PANEL_CLASS}__loading`;
      loading.textContent = "Loading your inventory…";
      body.appendChild(loading);
      return;
    }
    if (state.kind === "error") {
      headerStrip.setBalance(Number.NaN);
      headerStrip.setPowerUps(0);
      body.innerHTML = "";
      const err = document.createElement("div");
      err.className = `${PANEL_CLASS}__error`;
      err.textContent = state.message;
      body.appendChild(err);
      return;
    }
    headerStrip.setBalance(state.balanceUsd);
    headerStrip.setPowerUps(state.powerUps);
    const data = state;
    if (data.selectedId !== null) {
      const selectedId = data.selectedId;
      const record = data.purchases.find((p) => p.id === selectedId);
      if (record !== undefined) {
        const fields = pickItemFields(
          data.items[
            buildPurchaseItemKey({
              itemRef: record.itemRef,
              spaceId: record.spaceId,
            })
          ]
        );
        renderDetail(record, fields);
        return;
      }
      state = { ...data, selectedId: null };
    }
    renderList(data.purchases, data.items);
  };

  const open = (): void => {
    if (isOpen) return;
    isOpen = true;
    backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
    state = { kind: "loading" };
    renderCurrent();
    options.onRefresh();
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  closeBtn.addEventListener("click", () => close());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && isOpen) close();
  };
  document.addEventListener("keydown", onKey);

  return {
    root: backdrop,
    open,
    close,
    isOpen: () => isOpen,
    setData: ({ balanceUsd, powerUps, purchases, items }) => {
      state = {
        kind: "data",
        balanceUsd,
        powerUps,
        purchases,
        items,
        selectedId: null,
      };
      if (isOpen) renderCurrent();
    },
    setLoading: () => {
      state = { kind: "loading" };
      if (isOpen) renderCurrent();
    },
    setError: (message: string) => {
      state = { kind: "error", message };
      if (isOpen) renderCurrent();
    },
    destroy: () => {
      document.removeEventListener("keydown", onKey);
      if (backdrop.parentElement === options.parent) {
        options.parent.removeChild(backdrop);
      }
    },
  };
};
