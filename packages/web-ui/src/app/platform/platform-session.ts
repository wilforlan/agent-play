const STORAGE_KEY = "agent-play-platform-preview";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PlatformRememberPreview = {
  serverUrl: string;
  nodeId: string;
  spaceCatalogId: string;
  spaceName: string;
  lastAuthenticatedAt: string;
};

type StoredPreview = PlatformRememberPreview & {
  expiresAt: string;
};

export const savePlatformRememberPreview = (preview: PlatformRememberPreview): void => {
  if (typeof window === "undefined") return;
  const stored: StoredPreview = {
    ...preview,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
};

export const loadPlatformRememberPreview = (): PlatformRememberPreview | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPreview;
    const expiresAt = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (
      typeof parsed.serverUrl !== "string" ||
      typeof parsed.nodeId !== "string" ||
      typeof parsed.spaceCatalogId !== "string" ||
      typeof parsed.lastAuthenticatedAt !== "string"
    ) {
      return null;
    }
    return {
      serverUrl: parsed.serverUrl,
      nodeId: parsed.nodeId,
      spaceCatalogId: parsed.spaceCatalogId,
      spaceName:
        typeof parsed.spaceName === "string" && parsed.spaceName.length > 0
          ? parsed.spaceName
          : parsed.spaceCatalogId,
      lastAuthenticatedAt: parsed.lastAuthenticatedAt,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearPlatformRememberPreview = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const isTenWordPassphrase = (value: string): boolean => {
  const words = value.trim().split(/\s+/).filter((w) => w.length > 0);
  return words.length === 10;
};
