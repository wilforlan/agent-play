/// <reference types="vite/client" />

/**
 * @module @agent-play/play-ui/vite-env
 * Vite **`import.meta.env`** typings for the preview bundle (`VITE_PLAY_API_BASE`, etc.).
 */

interface ImportMetaEnv {
  readonly VITE_PLAY_API_BASE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_REPO_URL?: string;
}
