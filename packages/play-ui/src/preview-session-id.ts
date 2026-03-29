export const PREVIEW_SESSION_STORAGE_KEY = "agent-play.sessionId";

export function persistPreviewSessionId(sid: string): void {
  try {
    sessionStorage.setItem(PREVIEW_SESSION_STORAGE_KEY, sid);
  } catch {
    return;
  }
}

export function readPreviewSessionId(): string | null {
  try {
    const v = sessionStorage.getItem(PREVIEW_SESSION_STORAGE_KEY);
    return v !== null && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function getPreviewSessionIdSync(): string | null {
  const stored = readPreviewSessionId();
  if (stored !== null) {
    const t = stored.trim();
    if (t.length > 0) return t;
  }
  if (typeof location === "undefined") return null;
  const fromUrl = new URLSearchParams(location.search).get("sid");
  if (fromUrl !== null && fromUrl.trim().length > 0) {
    const u = fromUrl.trim();
    persistPreviewSessionId(u);
    return u;
  }
  return null;
}

export async function ensurePreviewSessionId(): Promise<string | null> {
  try {
    const res = await fetch("/api/agent-play/session", { cache: "no-store" });
    if (res.ok) {
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        "sid" in json &&
        typeof (json as { sid: unknown }).sid === "string"
      ) {
        const sid = (json as { sid: string }).sid.trim();
        if (sid.length > 0) {
          const prev = readPreviewSessionId();
          if (prev !== sid) {
            persistPreviewSessionId(sid);
          }
          return sid;
        }
      }
    }
  } catch {
    return fallbackPreviewSessionIdFromStorageOrUrl();
  }
  return fallbackPreviewSessionIdFromStorageOrUrl();
}

function fallbackPreviewSessionIdFromStorageOrUrl(): string | null {
  return getPreviewSessionIdSync();
}
