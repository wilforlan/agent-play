/**
 * @module @agent-play/play-ui/preview-app-meta
 * preview app meta — preview canvas module (Pixi + DOM).
 */
const DEFAULT_VERSION = "0.1.0";
const DEFAULT_REPO_URL = "https://github.com/wilforlan/agent-play";

export type PreviewAppMeta = {
  version: string;
  repoUrl: string;
};

export function getPreviewAppMeta(): PreviewAppMeta {
  return {
    version: resolveVersion(),
    repoUrl: resolveRepoUrl(),
  };
}

function resolveVersion(): string {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env !== undefined &&
    typeof import.meta.env.VITE_APP_VERSION === "string" &&
    import.meta.env.VITE_APP_VERSION.length > 0
  ) {
    return import.meta.env.VITE_APP_VERSION;
  }
  return DEFAULT_VERSION;
}

function resolveRepoUrl(): string {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env !== undefined &&
    typeof import.meta.env.VITE_APP_REPO_URL === "string" &&
    import.meta.env.VITE_APP_REPO_URL.length > 0
  ) {
    return import.meta.env.VITE_APP_REPO_URL;
  }
  return DEFAULT_REPO_URL;
}
