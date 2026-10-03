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
import type { OwnedAssetEntryDto } from "./wallet-owned-assets-client.js";
import { createWalletDisplayStrip } from "./wallet-display-strip.js";
import { WALLET_BUNDLE_OFFERS } from "@agent-play/sdk/browser";
import type { ParkingDurationTier } from "@agent-play/sdk/browser";

export type ActiveParkingRow = {
  readonly bay: number;
  readonly layer: number;
  readonly displayNick: string;
  readonly tier: ParkingDurationTier;
  readonly expiresAt: string | null;
};

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
    assets?: ReadonlyArray<OwnedAssetEntryDto>;
    activeParking?: ReadonlyArray<ActiveParkingRow>;
    parkingCapacityHint?: string;
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
  /**
   * When set, shows an "Exchange power-ups" strip to redeem USD balance
   * bundles (see `./wallet-bundle-client`).
   */
  readonly onRedeemBundle?: (bundleId: string) => Promise<void>;
  readonly onCreateTransferListing?: (input: {
    spaceId: string;
    amenityKind: OwnedAssetEntryDto["ref"]["amenityKind"];
    itemId: string;
    priceUsd: number;
  }) => Promise<void>;
  readonly onUpdateTransferListingPrice?: (input: {
    spaceId: string;
    amenityKind: OwnedAssetEntryDto["ref"]["amenityKind"];
    itemId: string;
    priceUsd: number;
  }) => Promise<void>;
  readonly onCancelTransferListing?: (input: {
    spaceId: string;
    amenityKind: OwnedAssetEntryDto["ref"]["amenityKind"];
    itemId: string;
  }) => Promise<void>;
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
.${PANEL_CLASS}__tabs {
  display: flex;
  gap: 8px;
  padding: 10px 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(15,23,42,0.08);
}
.${PANEL_CLASS}__tab {
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.${PANEL_CLASS}__tab--active {
  color: #0f172a;
  border-bottom-color: #16a34a;
}
.${PANEL_CLASS}__asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.${PANEL_CLASS}__asset-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,0.08);
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15,23,42,0.08);
  min-width: 0;
}
.${PANEL_CLASS}__asset-sprite {
  width: 100%;
  aspect-ratio: 1.35;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.04em;
  color: #ffffff;
}
.${PANEL_CLASS}__asset-sprite--shop { background: #b45309; }
.${PANEL_CLASS}__asset-sprite--supermarket { background: #0f766e; }
.${PANEL_CLASS}__asset-sprite--car_wash { background: #334155; }
.${PANEL_CLASS}__asset-card-title {
  font-weight: 800;
  font-size: 14px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.${PANEL_CLASS}__asset-card-meta {
  font-size: 12px;
  color: #64748b;
  overflow-wrap: anywhere;
}
.${PANEL_CLASS}__asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}
.${PANEL_CLASS}__asset-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  background: #16a34a;
  color: #fff;
}
.${PANEL_CLASS}__asset-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.${PANEL_CLASS}__asset-btn--secondary {
  background: #e2e8f0;
  color: #0f172a;
}
.${PANEL_CLASS}__asset-btn--danger {
  background: #b91c1c;
}
.${PANEL_CLASS}__available-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #86efac;
  color: #14532d;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  vertical-align: middle;
}
.${PANEL_CLASS}__asset-step {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,0.08);
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(15,23,42,0.10);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.${PANEL_CLASS}__asset-step-title {
  font-size: 16px;
  font-weight: 800;
}
.${PANEL_CLASS}__asset-step-copy {
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
}
.${PANEL_CLASS}__price-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(15,23,42,0.16);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.${PANEL_CLASS}__asset-step-error {
  color: #b91c1c;
  font-size: 12px;
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
  grid-template-columns: 44px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: start;
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
.${PANEL_CLASS}__chip--parking { background: #dbeafe; color: #1e3a8a; }
.${PANEL_CLASS}__chip--house { background: #fde68a; color: #78350f; }
.${PANEL_CLASS}__parking {
  margin: 0 20px 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
}
.${PANEL_CLASS}__parking-title {
  font-size: 13px;
  font-weight: 700;
  color: #312e81;
  margin-bottom: 4px;
}
.${PANEL_CLASS}__parking-hint {
  font-size: 12px;
  color: #4338ca;
  margin-bottom: 8px;
}
.${PANEL_CLASS}__parking-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  padding: 6px 0;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
}
.${PANEL_CLASS}__parking-row:first-of-type { border-top: none; }
.${PANEL_CLASS}__chip--shop { background: #fde68a; color: #78350f; }
.${PANEL_CLASS}__chip--supermarket { background: #bbf7d0; color: #064e3b; }
.${PANEL_CLASS}__chip--talk_time {
  background: linear-gradient(135deg, #94a3b8, #e2e8f0 55%, #64748b);
  color: #0f172a;
  border: 1px solid rgba(15,23,42,0.2);
}
.${PANEL_CLASS}__chip--peer_talk_time {
  background: linear-gradient(135deg, #64748b, #cbd5e1 55%, #475569);
  color: #0f172a;
  border: 1px solid rgba(15,23,42,0.2);
}
.${PANEL_CLASS}__chip--wallet_bundle {
  background: linear-gradient(135deg, #34d399, #6ee7b7 50%, #059669);
  color: #022c22;
  border: 1px solid rgba(6,78,59,0.35);
}
.${PANEL_CLASS}__bundles {
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(15,23,42,0.08);
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.${PANEL_CLASS}__bundles-title {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 800;
  color: #334155;
  letter-spacing: 0.3px;
}
.${PANEL_CLASS}__bundle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148,163,184,0.35);
}
.${PANEL_CLASS}__bundle-row:last-child { border-bottom: none; padding-bottom: 0; }
.${PANEL_CLASS}__bundle-label { font-size: 13px; font-weight: 700; color: #1e293b; }
.${PANEL_CLASS}__bundle-meta { font-size: 12px; color: #64748b; }
.${PANEL_CLASS}__bundle-btn {
  border: none;
  background: #0f766e;
  color: #ecfdf5;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.${PANEL_CLASS}__bundle-btn:hover:not(:disabled) { background: #115e59; }
.${PANEL_CLASS}__bundle-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.${PANEL_CLASS}__name {
  font-weight: 700;
  font-size: 14px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.${PANEL_CLASS}__sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.${PANEL_CLASS}__price {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  font-size: 13px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 9rem;
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
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
  gap: 6px 14px;
  font-size: 13px;
  margin-bottom: 16px;
}
.${PANEL_CLASS}__meta-key {
  color: #64748b;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.${PANEL_CLASS}__meta > :not(.${PANEL_CLASS}__meta-key) {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
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

const formatApuAmount = (delta: number): string => {
  const amount = Math.abs(Math.trunc(delta));
  return delta >= 0 ? `+${String(amount)} APU` : `-${String(amount)} APU`;
};

const formatTransactionAmount = (record: PurchaseRecordDto): string => {
  if (
    record.amenityKind === "apu_credit" ||
    record.amenityKind === "apu_debit" ||
    (record.amenityKind === "arcade_pass" &&
      typeof record.powerUpsDelta === "number")
  ) {
    const delta =
      typeof record.powerUpsDelta === "number"
        ? record.powerUpsDelta
        : typeof record.powerUpsEarned === "number"
          ? record.powerUpsEarned
          : typeof record.powerUpsSpent === "number"
            ? -record.powerUpsSpent
            : 0;
    return formatApuAmount(delta);
  }
  if (
    typeof record.powerUpsEarned === "number" &&
    Number.isFinite(record.powerUpsEarned) &&
    typeof record.priceUsd === "number"
  ) {
    return `${formatUsd(record.priceUsd)} · +${String(record.powerUpsEarned)} APU`;
  }
  if (typeof record.priceUsd === "number" && Number.isFinite(record.priceUsd)) {
    return formatUsd(record.priceUsd);
  }
  if (
    typeof record.powerUpsSpent === "number" &&
    Number.isFinite(record.powerUpsSpent)
  ) {
    return `-${String(record.powerUpsSpent)} APU`;
  }
  return "—";
};

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

const AMENITY_LABEL: Record<string, string> = {
  shop: "Shop",
  supermarket: "Supermarket",
  car_wash: "Car Wash",
  parking: "Parking",
  house: "House",
  talk_time: "Voice",
  peer_talk_time: "Peer Voice",
  wallet_bundle: "Bundle",
  apu_credit: "APU Credit",
  apu_debit: "APU Debit",
  arcade_pass: "Arcade Pass",
  education_pass: "Education Pass",
  education_tuition: "School Fees",
};

const isVoiceTalkAmenity = (
  kind: PurchaseRecordDto["amenityKind"]
): boolean => kind === "talk_time" || kind === "peer_talk_time";

const voiceTalkDisplayName = (
  kind: PurchaseRecordDto["amenityKind"]
): string => (kind === "peer_talk_time" ? "Peer voice" : "Realtime voice");

const formatParkingExpiry = (input: {
  tier: ParkingDurationTier;
  expiresAt: string | null;
}): string => {
  if (input.tier === "forever" || input.expiresAt === null) {
    return "Forever";
  }
  const ms = new Date(input.expiresAt).getTime() - Date.now();
  if (ms <= 0) {
    return "Expired";
  }
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 48) {
    return `${String(hours)}h left`;
  }
  const days = Math.floor(hours / 24);
  return `${String(days)}d left`;
};

const amenityLabelForDisplay = (kind: string): string => {
  if (kind in AMENITY_LABEL) {
    return AMENITY_LABEL[kind] ?? "Activity";
  }
  return "Activity";
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
  if (isVoiceTalkAmenity(input.record.amenityKind)) {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : voiceTalkDisplayName(input.record.amenityKind);
    return `${detail} · ${at}`;
  }
  if (input.record.amenityKind === "wallet_bundle") {
    const spent = input.record.powerUpsSpent;
    const puPart =
      typeof spent === "number" && Number.isFinite(spent)
        ? `${String(Math.max(0, Math.floor(spent)))} APU redeemed · `
        : "";
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : "Wallet bundle";
    return `${puPart}${detail} · ${at}`;
  }
  if (input.record.amenityKind === "arcade_pass") {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : input.record.itemRef.id === "week"
          ? "Arcade weekly pass"
          : "Arcade day pass";
    return `${detail} · ${at}`;
  }
  if (input.record.amenityKind === "education_pass") {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : "Elm Street day entry";
    return `${detail} · ${at}`;
  }
  if (input.record.amenityKind === "education_tuition") {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : "Elm Street school fees";
    return `${detail} · ${at}`;
  }
  if (
    input.record.amenityKind === "apu_credit" ||
    input.record.amenityKind === "apu_debit"
  ) {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : input.record.amenityKind === "apu_credit"
          ? "APU credit"
          : "APU debit";
    const source =
      input.record.amenityKind === "apu_credit"
        ? input.record.creditSource
        : input.record.debitSource;
    const sourcePart =
      typeof source === "string" && source.length > 0 ? `${source} · ` : "";
    return `${sourcePart}${detail} · ${at}`;
  }
  if (
    typeof input.record.powerUpsEarned === "number" &&
    Number.isFinite(input.record.powerUpsEarned)
  ) {
    return `+${String(input.record.powerUpsEarned)} APU earned · Bought ${at}`;
  }
  if (input.record.amenityKind === "car_wash") {
    const model = input.fields.model ?? "";
    const year =
      typeof input.fields.year === "number" ? String(input.fields.year) : "";
    const left = [model, year].filter((s) => s.length > 0).join(" · ");
    return left.length > 0
      ? `${left} · Bought ${at}`
      : `Bought ${at}`;
  }
  if (input.record.amenityKind === "parking") {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : "Parking ticket";
    return `${detail} · ${at}`;
  }
  if (input.record.amenityKind === "house") {
    const detail =
      typeof input.record.detail === "string" && input.record.detail.length > 0
        ? input.record.detail
        : "House purchase";
    return `${detail} · ${at}`;
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
  titleEl.textContent = "Wallet & Activity";
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

  type PanelTab = "assets" | "activity";

  type AssetFlow =
    | {
        kind: "sell";
        entry: OwnedAssetEntryDto;
        priceText: string;
        error: string | null;
        busy: boolean;
      }
    | {
        kind: "cancel";
        entry: OwnedAssetEntryDto;
        busy: boolean;
      };

  type ViewState =
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "data";
        balanceUsd: number;
        powerUps: number;
        purchases: ReadonlyArray<PurchaseRecordDto>;
        items: Readonly<Record<string, unknown>>;
        assets: ReadonlyArray<OwnedAssetEntryDto>;
        selectedId: string | null;
        activeParking: ReadonlyArray<ActiveParkingRow>;
        parkingCapacityHint: string;
        tab: PanelTab;
        assetFlow: AssetFlow | null;
      };

  let state: ViewState = { kind: "loading" };
  let isOpen = false;
  let activeTab: PanelTab = "activity";

  const assetKey = (entry: OwnedAssetEntryDto): string =>
    `${entry.ref.amenityKind}:${entry.ref.spaceId}:${entry.ref.itemId}`;

  const assetSpriteLabel = (entry: OwnedAssetEntryDto): string => {
    if (entry.ref.amenityKind === "car_wash") {
      return (entry.item.model ?? entry.item.name ?? "CAR").slice(0, 6).toUpperCase();
    }
    if (entry.ref.amenityKind === "shop") {
      return (entry.item.type ?? "SHOP").slice(0, 6).toUpperCase();
    }
    return "ITEM";
  };

  const assetSpriteColor = (entry: OwnedAssetEntryDto): string | null => {
    if (
      entry.ref.amenityKind === "car_wash" &&
      typeof entry.item.colorHex === "string" &&
      entry.item.colorHex.length > 0
    ) {
      return entry.item.colorHex;
    }
    return null;
  };

  const appendBundleExchangeSection = (
    parent: HTMLElement,
    powerUps: number
  ): void => {
    if (options.onRedeemBundle === undefined) return;
    const wrap = document.createElement("div");
    wrap.className = `${PANEL_CLASS}__bundles`;
    const title = document.createElement("h3");
    title.className = `${PANEL_CLASS}__bundles-title`;
    title.textContent = "Exchange power-ups";
    wrap.appendChild(title);
    for (const offer of WALLET_BUNDLE_OFFERS) {
      const row = document.createElement("div");
      row.className = `${PANEL_CLASS}__bundle-row`;
      const left = document.createElement("div");
      const label = document.createElement("div");
      label.className = `${PANEL_CLASS}__bundle-label`;
      label.textContent = `+${formatUsd(offer.creditUsd)} balance`;
      const meta = document.createElement("div");
      meta.className = `${PANEL_CLASS}__bundle-meta`;
      meta.textContent = `${String(offer.powerUpsCost)} power-ups`;
      left.append(label, meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `${PANEL_CLASS}__bundle-btn`;
      btn.textContent = "Redeem";
      btn.disabled = powerUps < offer.powerUpsCost;
      btn.addEventListener("click", async () => {
        if (options.onRedeemBundle === undefined) return;
        btn.disabled = true;
        try {
          await options.onRedeemBundle(offer.id);
        } finally {
          btn.disabled = false;
        }
      });
      row.append(left, btn);
      wrap.appendChild(row);
    }
    parent.appendChild(wrap);
  };

  const renderActiveParkingSection = (
    parent: HTMLElement,
    rows: ReadonlyArray<ActiveParkingRow>,
    capacityHint: string
  ): void => {
    const wrap = document.createElement("div");
    wrap.className = `${PANEL_CLASS}__parking`;
    const title = document.createElement("div");
    title.className = `${PANEL_CLASS}__parking-title`;
    title.textContent = "Active parking";
    const hint = document.createElement("div");
    hint.className = `${PANEL_CLASS}__parking-hint`;
    hint.textContent = capacityHint;
    wrap.append(title, hint);
    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.color = "#4b5563";
      empty.textContent = "No active parking spots.";
      wrap.appendChild(empty);
    } else {
      for (const row of rows) {
        const line = document.createElement("div");
        line.className = `${PANEL_CLASS}__parking-row`;
        const left = document.createElement("span");
        left.textContent = `Bay ${String(row.bay)} · ${row.displayNick}`;
        const right = document.createElement("span");
        right.textContent = `${row.tier} · ${formatParkingExpiry(row)}`;
        line.append(left, right);
        wrap.appendChild(line);
      }
    }
    parent.appendChild(wrap);
  };

  const renderTabs = (parent: HTMLElement, tab: PanelTab): void => {
    const tabs = document.createElement("div");
    tabs.className = `${PANEL_CLASS}__tabs`;
    for (const entry of [
      { id: "assets" as const, label: "Assets" },
      { id: "activity" as const, label: "Activity" },
    ]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `${PANEL_CLASS}__tab${
        tab === entry.id ? ` ${PANEL_CLASS}__tab--active` : ""
      }`;
      btn.textContent = entry.label;
      btn.addEventListener("click", () => {
        activeTab = entry.id;
        if (state.kind === "data") {
          state = {
            ...state,
            tab: entry.id,
            selectedId: null,
            assetFlow: null,
          };
          renderCurrent();
        }
      });
      tabs.appendChild(btn);
    }
    parent.appendChild(tabs);
  };

  const renderAssetStep = (parent: HTMLElement, flow: AssetFlow): void => {
    const step = document.createElement("div");
    step.className = `${PANEL_CLASS}__asset-step`;

    const back = document.createElement("button");
    back.type = "button";
    back.className = `${PANEL_CLASS}__back`;
    back.textContent = "← Back to assets";
    back.disabled = flow.busy;
    back.addEventListener("click", () => {
      if (state.kind !== "data" || flow.busy) return;
      state = { ...state, assetFlow: null };
      renderCurrent();
    });
    step.appendChild(back);

    const title = document.createElement("div");
    title.className = `${PANEL_CLASS}__asset-step-title`;
    title.textContent =
      flow.kind === "sell" ? "Set sale price" : "Cancel this sale?";
    step.appendChild(title);

    const sprite = document.createElement("div");
    sprite.className = `${PANEL_CLASS}__asset-sprite ${PANEL_CLASS}__asset-sprite--${flow.entry.ref.amenityKind}`;
    sprite.textContent = assetSpriteLabel(flow.entry);
    const spriteColor = assetSpriteColor(flow.entry);
    if (spriteColor !== null) {
      sprite.style.background = spriteColor;
    }
    step.appendChild(sprite);

    const copy = document.createElement("div");
    copy.className = `${PANEL_CLASS}__asset-step-copy`;
    const itemName = flow.entry.item.name ?? flow.entry.ref.itemId;
    if (flow.kind === "sell") {
      copy.textContent = `List ${itemName} on the amenity map. Buyers pay this APW$ price; the platform burns 1.5% (capped at $100).`;
    } else {
      const ask = flow.entry.item.sale.transferListing?.priceUsd;
      copy.textContent =
        ask !== undefined
          ? `${itemName} is listed at $${ask.toFixed(2)}. Cancel removes it from the market.`
          : `${itemName} will be removed from the market.`;
    }
    step.appendChild(copy);

    if (flow.kind === "sell") {
      const input = document.createElement("input");
      input.className = `${PANEL_CLASS}__price-input`;
      input.type = "number";
      input.min = "0.01";
      input.step = "0.01";
      input.placeholder = "Price in APW$";
      input.value = flow.priceText;
      input.disabled = flow.busy;
      input.addEventListener("input", () => {
        if (state.kind !== "data" || state.assetFlow?.kind !== "sell") return;
        state = {
          ...state,
          assetFlow: {
            ...state.assetFlow,
            priceText: input.value,
            error: null,
          },
        };
      });
      step.appendChild(input);
      if (flow.error !== null) {
        const err = document.createElement("div");
        err.className = `${PANEL_CLASS}__asset-step-error`;
        err.textContent = flow.error;
        step.appendChild(err);
      }
      const actions = document.createElement("div");
      actions.className = `${PANEL_CLASS}__asset-actions`;
      const listBtn = document.createElement("button");
      listBtn.type = "button";
      listBtn.className = `${PANEL_CLASS}__asset-btn`;
      listBtn.textContent = flow.busy ? "Listing…" : "List for sale";
      listBtn.disabled = flow.busy;
      listBtn.addEventListener("click", async () => {
        if (state.kind !== "data" || state.assetFlow?.kind !== "sell") return;
        if (options.onCreateTransferListing === undefined) return;
        const priceUsd = Number(state.assetFlow.priceText);
        if (!(Number.isFinite(priceUsd) && priceUsd > 0)) {
          state = {
            ...state,
            assetFlow: {
              ...state.assetFlow,
              error: "Enter a positive price in APW$.",
            },
          };
          renderCurrent();
          return;
        }
        state = {
          ...state,
          assetFlow: { ...state.assetFlow, busy: true, error: null },
        };
        renderCurrent();
        try {
          await options.onCreateTransferListing({
            spaceId: flow.entry.ref.spaceId,
            amenityKind: flow.entry.ref.amenityKind,
            itemId: flow.entry.ref.itemId,
            priceUsd,
          });
          if (state.kind === "data") {
            state = { ...state, assetFlow: null };
          }
        } catch (error) {
          if (state.kind === "data" && state.assetFlow?.kind === "sell") {
            state = {
              ...state,
              assetFlow: {
                ...state.assetFlow,
                busy: false,
                error:
                  error instanceof Error ? error.message : "Could not list item",
              },
            };
          }
        }
        renderCurrent();
      });
      actions.appendChild(listBtn);
      step.appendChild(actions);
    } else {
      const actions = document.createElement("div");
      actions.className = `${PANEL_CLASS}__asset-actions`;
      const keep = document.createElement("button");
      keep.type = "button";
      keep.className = `${PANEL_CLASS}__asset-btn ${PANEL_CLASS}__asset-btn--secondary`;
      keep.textContent = "Keep listed";
      keep.disabled = flow.busy;
      keep.addEventListener("click", () => {
        if (state.kind !== "data" || flow.busy) return;
        state = { ...state, assetFlow: null };
        renderCurrent();
      });
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = `${PANEL_CLASS}__asset-btn ${PANEL_CLASS}__asset-btn--danger`;
      confirm.textContent = flow.busy ? "Cancelling…" : "Confirm cancel";
      confirm.disabled = flow.busy;
      confirm.addEventListener("click", async () => {
        if (state.kind !== "data" || state.assetFlow?.kind !== "cancel") return;
        if (options.onCancelTransferListing === undefined) return;
        state = {
          ...state,
          assetFlow: { ...state.assetFlow, busy: true },
        };
        renderCurrent();
        try {
          await options.onCancelTransferListing({
            spaceId: flow.entry.ref.spaceId,
            amenityKind: flow.entry.ref.amenityKind,
            itemId: flow.entry.ref.itemId,
          });
          if (state.kind === "data") {
            state = { ...state, assetFlow: null };
          }
        } catch {
          if (state.kind === "data" && state.assetFlow?.kind === "cancel") {
            state = {
              ...state,
              assetFlow: { ...state.assetFlow, busy: false },
            };
          }
        }
        renderCurrent();
      });
      actions.append(keep, confirm);
      step.appendChild(actions);
    }

    parent.appendChild(step);
  };

  const renderAssetsList = (
    parent: HTMLElement,
    assets: ReadonlyArray<OwnedAssetEntryDto>
  ): void => {
    if (assets.length === 0) {
      const empty = document.createElement("div");
      empty.className = `${PANEL_CLASS}__empty`;
      empty.textContent = "No owned amenity assets yet.";
      parent.appendChild(empty);
      return;
    }
    const grid = document.createElement("div");
    grid.className = `${PANEL_CLASS}__asset-grid`;
    for (const entry of assets) {
      const card = document.createElement("div");
      card.className = `${PANEL_CLASS}__asset-card`;
      card.dataset.assetKey = assetKey(entry);

      const sprite = document.createElement("div");
      sprite.className = `${PANEL_CLASS}__asset-sprite ${PANEL_CLASS}__asset-sprite--${entry.ref.amenityKind}`;
      sprite.textContent = assetSpriteLabel(entry);
      const spriteColor = assetSpriteColor(entry);
      if (spriteColor !== null) {
        sprite.style.background = spriteColor;
      }
      card.appendChild(sprite);

      const title = document.createElement("div");
      title.className = `${PANEL_CLASS}__asset-card-title`;
      title.append(document.createTextNode(entry.item.name ?? entry.ref.itemId));
      if (entry.item.sale.status === "transfer_available") {
        const tag = document.createElement("span");
        tag.className = `${PANEL_CLASS}__available-tag`;
        tag.textContent = "available";
        title.appendChild(tag);
      }
      card.appendChild(title);

      const meta = document.createElement("div");
      meta.className = `${PANEL_CLASS}__asset-card-meta`;
      const ask =
        entry.item.sale.transferListing?.priceUsd ?? entry.item.priceUsd;
      meta.textContent =
        entry.item.sale.status === "transfer_available"
          ? `Listed at $${ask.toFixed(2)}`
          : `Owned · $${entry.item.priceUsd.toFixed(2)}`;
      card.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = `${PANEL_CLASS}__asset-actions`;
      if (entry.item.sale.status === "sold") {
        const sell = document.createElement("button");
        sell.type = "button";
        sell.className = `${PANEL_CLASS}__asset-btn`;
        sell.textContent = "Sell";
        sell.addEventListener("click", () => {
          if (state.kind !== "data") return;
          state = {
            ...state,
            assetFlow: {
              kind: "sell",
              entry,
              priceText: String(entry.item.priceUsd),
              error: null,
              busy: false,
            },
          };
          renderCurrent();
        });
        actions.appendChild(sell);
      } else if (entry.item.sale.status === "transfer_available") {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = `${PANEL_CLASS}__asset-btn ${PANEL_CLASS}__asset-btn--danger`;
        cancel.textContent = "Cancel sale";
        cancel.addEventListener("click", () => {
          if (state.kind !== "data") return;
          state = {
            ...state,
            assetFlow: {
              kind: "cancel",
              entry,
              busy: false,
            },
          };
          renderCurrent();
        });
        actions.appendChild(cancel);
      }
      card.appendChild(actions);
      grid.appendChild(card);
    }
    parent.appendChild(grid);
  };

  const renderPurchasesList = (
    parent: HTMLElement,
    purchases: ReadonlyArray<PurchaseRecordDto>,
    items: Readonly<Record<string, unknown>>
  ): void => {
    if (purchases.length === 0) {
      const empty = document.createElement("div");
      empty.className = `${PANEL_CLASS}__empty`;
      empty.textContent = "No wallet activity yet.";
      parent.appendChild(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = `${PANEL_CLASS}__list`;
    for (const record of purchases) {
      const key = buildPurchaseItemKey({
        itemRef: record.itemRef,
        spaceId: record.spaceId,
      });
      const fields = key !== null ? pickItemFields(items[key]) : {};
      const row = document.createElement("div");
      row.className = `${PANEL_CLASS}__row`;

      const chip = document.createElement("div");
      chip.className = `${PANEL_CLASS}__chip ${PANEL_CLASS}__chip--${record.amenityKind}`;
      chip.textContent = amenityLabelForDisplay(record.amenityKind).slice(0, 2);
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
        isVoiceTalkAmenity(record.amenityKind)
          ? voiceTalkDisplayName(record.amenityKind)
          : record.amenityKind === "wallet_bundle"
            ? `+${formatUsd(record.priceUsd ?? 0)} balance`
            : record.amenityKind === "arcade_pass"
              ? record.itemRef.id === "week"
                ? "Arcade weekly pass"
                : "Arcade day pass"
              : record.amenityKind === "education_pass"
                ? record.detail ?? "Elm Street day entry"
              : record.amenityKind === "apu_credit" ||
                  record.amenityKind === "apu_debit"
                ? record.detail ??
                  (record.amenityKind === "apu_credit"
                    ? "APU credit"
                    : "APU debit")
                : fields.name ?? amenityLabelForDisplay(record.amenityKind) + " item";
      const subEl = document.createElement("div");
      subEl.className = `${PANEL_CLASS}__sub`;
      subEl.textContent = buildPurchaseSubtitle({ record, fields });
      nameWrap.append(nameEl, subEl);
      row.appendChild(nameWrap);

      const price = document.createElement("div");
      price.className = `${PANEL_CLASS}__price`;
      price.textContent = formatTransactionAmount(record);
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
      if (
        !isVoiceTalkAmenity(record.amenityKind) &&
        record.amenityKind !== "wallet_bundle" &&
        record.amenityKind !== "arcade_pass" &&
        record.amenityKind !== "education_pass" &&
        record.amenityKind !== "education_tuition" &&
        record.amenityKind !== "apu_credit" &&
        record.amenityKind !== "apu_debit"
      ) {
        row.appendChild(openBtn);
      }
      list.appendChild(row);
    }
    parent.appendChild(list);
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
      isVoiceTalkAmenity(record.amenityKind)
        ? voiceTalkDisplayName(record.amenityKind)
        : record.amenityKind === "wallet_bundle"
          ? `+${formatUsd(record.priceUsd ?? 0)} balance`
          : record.amenityKind === "arcade_pass"
            ? record.itemRef.id === "week"
              ? "Arcade weekly pass"
              : "Arcade day pass"
            : record.amenityKind === "education_pass"
              ? record.detail ?? "Elm Street day entry"
            : record.amenityKind === "apu_credit" ||
                record.amenityKind === "apu_debit"
              ? record.detail ??
                (record.amenityKind === "apu_credit" ? "APU credit" : "APU debit")
              : fields.name ?? amenityLabelForDisplay(record.amenityKind) + " item";
    headerRow.append(back, name);
    card.appendChild(headerRow);

    const hero = document.createElement("div");
    hero.className = `${PANEL_CLASS}__hero`;
    const heroColor =
      isVoiceTalkAmenity(record.amenityKind)
        ? "#334155"
        : record.amenityKind === "wallet_bundle"
          ? "#047857"
          : record.amenityKind === "arcade_pass"
            ? "#0f766e"
          : record.amenityKind === "education_pass"
            ? "#166534"
          : record.amenityKind === "apu_credit"
            ? "#1d4ed8"
            : record.amenityKind === "apu_debit"
              ? "#7c2d12"
              : record.amenityKind === "car_wash" && typeof fields.colorHex === "string"
                ? fields.colorHex
                : record.amenityKind === "shop"
                  ? "#b45309"
                  : "#0f766e";
    hero.style.background = heroColor;
    hero.textContent =
      isVoiceTalkAmenity(record.amenityKind)
        ? record.amenityKind === "peer_talk_time"
          ? "PEER"
          : "VOICE"
        : record.amenityKind === "wallet_bundle"
          ? "BUNDLE"
          : record.amenityKind === "arcade_pass"
            ? "PASS"
          : record.amenityKind === "education_pass"
            ? "ELM"
          : record.amenityKind === "apu_credit" ||
              record.amenityKind === "apu_debit"
            ? "APU"
            : fields.name ?? amenityLabelForDisplay(record.amenityKind).toUpperCase();
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
    pushMeta("Amenity", amenityLabelForDisplay(record.amenityKind));
    if (record.saleKind === "transfer") {
      pushMeta("Sale", "Transfer sale");
      if (typeof record.feeUsd === "number") {
        pushMeta("Platform fee burned", formatUsd(record.feeUsd));
      }
    }
    if (isVoiceTalkAmenity(record.amenityKind)) {
      if (
        typeof record.detail === "string" &&
        record.detail.trim().length > 0
      ) {
        pushMeta("Detail", record.detail);
      }
      if (
        record.amenityKind === "peer_talk_time" &&
        typeof record.counterpartyNodeId === "string"
      ) {
        pushMeta("Callee", record.counterpartyNodeId);
      }
    }
    if (record.amenityKind === "wallet_bundle") {
      if (
        typeof record.detail === "string" &&
        record.detail.trim().length > 0
      ) {
        pushMeta("Detail", record.detail);
      }
      if (
        typeof record.powerUpsSpent === "number" &&
        Number.isFinite(record.powerUpsSpent)
      ) {
        pushMeta("APU spent", String(Math.max(0, Math.floor(record.powerUpsSpent))));
      }
      if (typeof record.debitSource === "string") {
        pushMeta("Debit source", record.debitSource);
      }
      if (typeof record.creditSource === "string") {
        pushMeta("Credit source", record.creditSource);
      }
    }
    if (
      record.amenityKind === "apu_credit" ||
      record.amenityKind === "apu_debit"
    ) {
      if (typeof record.token === "string") pushMeta("Token", record.token);
      if (
        typeof record.powerUpsDelta === "number" &&
        Number.isFinite(record.powerUpsDelta)
      ) {
        pushMeta("APU change", formatApuAmount(record.powerUpsDelta));
      }
      if (typeof record.creditSource === "string") {
        pushMeta("Credit source", record.creditSource);
      }
      if (typeof record.debitSource === "string") {
        pushMeta("Debit source", record.debitSource);
      }
      if (typeof record.counterpartyNodeId === "string") {
        pushMeta("Counterparty node", record.counterpartyNodeId);
      }
      if (
        typeof record.detail === "string" &&
        record.detail.trim().length > 0
      ) {
        pushMeta("Detail", record.detail);
      }
    }
    if (record.amenityKind === "car_wash") {
      if (typeof fields.model === "string") pushMeta("Model", fields.model);
      if (typeof fields.year === "number")
        pushMeta("Year", String(fields.year));
    }
    if (typeof fields.type === "string") pushMeta("Kind", fields.type);
    pushMeta("Node", record.playerId);
    if (record.amenityKind === "wallet_bundle") {
      pushMeta("Balance credited", formatUsd(record.priceUsd ?? 0));
    } else if (
      typeof record.priceUsd === "number" &&
      Number.isFinite(record.priceUsd)
    ) {
      pushMeta("Price paid", formatUsd(record.priceUsd));
    }
    if (
      typeof record.powerUpsEarned === "number" &&
      Number.isFinite(record.powerUpsEarned)
    ) {
      pushMeta("APU earned", `+${String(record.powerUpsEarned)}`);
    }
    if (typeof record.debitSource === "string" && record.amenityKind !== "wallet_bundle" && record.amenityKind !== "apu_credit" && record.amenityKind !== "apu_debit") {
      pushMeta("Debit source", record.debitSource);
    }
    if (typeof record.creditSource === "string" && record.amenityKind !== "wallet_bundle" && record.amenityKind !== "apu_credit" && record.amenityKind !== "apu_debit") {
      pushMeta("Credit source", record.creditSource);
    }
    pushMeta("When", formatTimestamp(record.at));
    pushMeta("Space", record.spaceId);
    if (typeof fields.description === "string" && fields.description.length > 0)
      pushMeta("Notes", fields.description);
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = `${PANEL_CLASS}__detail-actions`;
    const scannerLink = document.createElement("a");
    scannerLink.className = `${PANEL_CLASS}__open`;
    scannerLink.href = `/scanner?view=txs&tx=${encodeURIComponent(record.id)}`;
    scannerLink.target = "_blank";
    scannerLink.rel = "noopener noreferrer";
    scannerLink.textContent = "View in Scanner";
    actions.appendChild(scannerLink);
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
        const itemKey = buildPurchaseItemKey({
          itemRef: record.itemRef,
          spaceId: record.spaceId,
        });
        const fields =
          itemKey !== null ? pickItemFields(data.items[itemKey]) : {};
        renderDetail(record, fields);
        return;
      }
      state = { ...data, selectedId: null };
    }
    body.innerHTML = "";
    appendBundleExchangeSection(body, data.powerUps);
    renderActiveParkingSection(
      body,
      data.activeParking,
      data.parkingCapacityHint
    );
    renderTabs(body, data.tab);
    if (data.tab === "assets") {
      if (data.assetFlow !== null) {
        renderAssetStep(body, data.assetFlow);
      } else {
        renderAssetsList(body, data.assets);
      }
    } else {
      renderPurchasesList(body, data.purchases, data.items);
    }
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
    setData: ({
      balanceUsd,
      powerUps,
      purchases,
      items,
      assets,
      activeParking,
      parkingCapacityHint,
    }) => {
      const previousFlow =
        state.kind === "data" && state.assetFlow !== null
          ? state.assetFlow
          : null;
      let nextFlow: AssetFlow | null = null;
      if (previousFlow !== null) {
        const stillOwned = (assets ?? []).find(
          (entry) => assetKey(entry) === assetKey(previousFlow.entry)
        );
        if (stillOwned !== undefined) {
          if (
            previousFlow.kind === "sell" &&
            stillOwned.item.sale.status === "sold"
          ) {
            nextFlow = { ...previousFlow, entry: stillOwned, busy: false };
          } else if (
            previousFlow.kind === "cancel" &&
            stillOwned.item.sale.status === "transfer_available"
          ) {
            nextFlow = { ...previousFlow, entry: stillOwned, busy: false };
          }
        }
      }
      state = {
        kind: "data",
        balanceUsd,
        powerUps,
        purchases,
        items,
        assets: assets ?? [],
        selectedId: null,
        activeParking: activeParking ?? [],
        parkingCapacityHint: parkingCapacityHint ?? "0 of 2 timed spots",
        tab: activeTab,
        assetFlow: nextFlow,
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
