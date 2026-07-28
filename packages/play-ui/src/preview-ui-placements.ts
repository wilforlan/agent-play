export type PreviewPanelPlacementId =
  | "messages"
  | "session"
  | "debug"
  | "proximity";

export type StoredPanelPlacement = {
  leftPx: number;
  topPx: number;
  collapsed?: boolean;
};

export type PreviewUiPlacements = {
  panels: Partial<Record<PreviewPanelPlacementId, StoredPanelPlacement>>;
};

export const PREVIEW_UI_PLACEMENTS_STORAGE_KEY =
  "agent-play-preview-ui-placements-v1";

const PANEL_IDS: readonly PreviewPanelPlacementId[] = [
  "messages",
  "session",
  "debug",
  "proximity",
];

let cached: PreviewUiPlacements = { panels: {} };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parsePlacement = (value: unknown): StoredPanelPlacement | null => {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isFiniteNumber(record.leftPx) || !isFiniteNumber(record.topPx)) {
    return null;
  }
  const placement: StoredPanelPlacement = {
    leftPx: record.leftPx,
    topPx: record.topPx,
  };
  if (typeof record.collapsed === "boolean") {
    placement.collapsed = record.collapsed;
  }
  return placement;
};

const parseStored = (raw: string | null): PreviewUiPlacements => {
  if (raw === null || raw.length === 0) return { panels: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return { panels: {} };
    const root = parsed as Record<string, unknown>;
    const panelsRaw =
      root.panels !== null && typeof root.panels === "object"
        ? (root.panels as Record<string, unknown>)
        : root;
    const panels: PreviewUiPlacements["panels"] = {};
    for (const id of PANEL_IDS) {
      const placement = parsePlacement(panelsRaw[id]);
      if (placement !== null) {
        panels[id] = placement;
      }
    }
    return { panels };
  } catch {
    return { panels: {} };
  }
};

const persist = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    PREVIEW_UI_PLACEMENTS_STORAGE_KEY,
    JSON.stringify(cached)
  );
};

export const loadPreviewUiPlacements = (): PreviewUiPlacements => {
  const raw =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(PREVIEW_UI_PLACEMENTS_STORAGE_KEY)
      : null;
  cached = parseStored(raw);
  return {
    panels: { ...cached.panels },
  };
};

export const clearPreviewUiPlacements = (): void => {
  cached = { panels: {} };
};

export const getPanelPlacement = (
  id: PreviewPanelPlacementId
): StoredPanelPlacement | null => {
  const placement = cached.panels[id];
  return placement === undefined ? null : { ...placement };
};

export const savePanelPlacement = (
  id: PreviewPanelPlacementId,
  placement: Partial<StoredPanelPlacement>
): void => {
  const previous = cached.panels[id];
  const leftPx = placement.leftPx ?? previous?.leftPx;
  const topPx = placement.topPx ?? previous?.topPx;
  if (
    leftPx === undefined ||
    topPx === undefined ||
    !Number.isFinite(leftPx) ||
    !Number.isFinite(topPx)
  ) {
    return;
  }
  const next: StoredPanelPlacement = { leftPx, topPx };
  const collapsed = placement.collapsed ?? previous?.collapsed;
  if (typeof collapsed === "boolean") {
    next.collapsed = collapsed;
  }
  cached = {
    panels: {
      ...cached.panels,
      [id]: next,
    },
  };
  persist();
};

if (typeof localStorage !== "undefined") {
  loadPreviewUiPlacements();
}
