/**
 * @module @agent-play/play-ui/preview-human-credentials
 * preview human credentials — preview canvas module (Pixi + DOM).
 */
const STORAGE_KEY = "agent-play.humanCredentials";

export type HumanCredentials = {
  nodeId: string;
  passw: string;
  createdAtIso?: string | undefined;
};

export function readHumanCredentials(): HumanCredentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) {
      return null;
    }
    const nodeId = (p as { nodeId?: unknown }).nodeId;
    const passw = (p as { passw?: unknown }).passw;
    const createdAtRaw = (p as { createdAtIso?: unknown }).createdAtIso;
    if (typeof nodeId !== "string" || typeof passw !== "string") {
      return null;
    }
    if (nodeId.trim().length === 0 || passw.length === 0) {
      return null;
    }
    const createdAtIso =
      typeof createdAtRaw === "string" && createdAtRaw.trim().length > 0
        ? createdAtRaw.trim()
        : undefined;
    return { nodeId: nodeId.trim(), passw, createdAtIso };
  } catch {
    return null;
  }
}

export function writeHumanCredentials(creds: HumanCredentials): void {
  try {
    const withTime: HumanCredentials = {
      ...creds,
      createdAtIso:
        creds.createdAtIso ?? new Date().toISOString(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(withTime));
  } catch {
    return;
  }
}

export function clearHumanCredentials(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function formatCredentialCreatedAt(iso: string | undefined): string {
  if (iso === undefined || iso.trim().length === 0) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getMainNodeIdForIntercom(): string | null {
  const c = readHumanCredentials();
  return c === null ? null : c.nodeId;
}

const CREDENTIALS_DOWNLOAD_FILENAME = "credentials.json";
const CREDENTIALS_DOWNLOAD_CLEANUP_MS = 200;

export function downloadHumanCredentialsJson(options: {
  nodeId: string;
  passw: string;
  serverUrl?: string | undefined;
}): void {
  const payload =
    options.serverUrl !== undefined && options.serverUrl.trim().length > 0
      ? {
          serverUrl: options.serverUrl.replace(/\/$/, ""),
          nodeId: options.nodeId,
          passw: options.passw,
        }
      : { nodeId: options.nodeId, passw: options.passw };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = CREDENTIALS_DOWNLOAD_FILENAME;
  anchor.rel = "noopener";
  anchor.style.position = "fixed";
  anchor.style.left = "-9999px";
  anchor.style.top = "0";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    if (anchor.parentNode !== null) {
      anchor.remove();
    }
    URL.revokeObjectURL(url);
  }, CREDENTIALS_DOWNLOAD_CLEANUP_MS);
}
