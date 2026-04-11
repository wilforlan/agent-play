/**
 * @module @agent-play/play-ui/preview-agent-play-root-key
 * preview agent play root key — preview canvas module (Pixi + DOM).
 */
export type ResolveAgentPlayRootKeyOptions = {
  apiBase: string;
};

function readViteRootKeyFromEnv(): string | undefined {
  if (typeof import.meta === "undefined") {
    return undefined;
  }
  const env = import.meta.env;
  if (typeof env !== "object" || env === null) {
    return undefined;
  }
  const raw = (env as { VITE_AGENT_PLAY_ROOT_KEY?: unknown })
    .VITE_AGENT_PLAY_ROOT_KEY;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  return raw.trim().toLowerCase();
}

export async function resolveAgentPlayRootKeyForBrowser(
  options: ResolveAgentPlayRootKeyOptions
): Promise<string> {
  const fromEnv = readViteRootKeyFromEnv();
  if (fromEnv !== undefined) {
    return fromEnv;
  }
  const base = options.apiBase.replace(/\/$/, "");
  const res = await fetch(`${base}/bootstrap`);
  if (!res.ok) {
    throw new Error(
      `Could not load Agent Play root key (${String(res.status)}). Set VITE_AGENT_PLAY_ROOT_KEY or ensure the server exposes GET ${base}/bootstrap.`
    );
  }
  const json: unknown = await res.json();
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { rootKey?: unknown }).rootKey !== "string"
  ) {
    throw new Error("bootstrap: invalid JSON");
  }
  return (json as { rootKey: string }).rootKey.trim().toLowerCase();
}
