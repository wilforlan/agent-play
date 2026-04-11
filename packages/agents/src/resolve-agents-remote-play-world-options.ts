import type { RemotePlayWorldOptions } from "@agent-play/sdk";

/**
 * When **`AGENT_PLAY_WEB_UI_URL`** is set (e.g. Docker Compose `http://web-ui:8888`), passes **`baseUrl`**
 * into `RemotePlayWorld` so HTTP targets the web UI container instead of **`localhost`** from a
 * host-generated **`credentials.json`**. When unset, the SDK uses **`serverUrl`** from credentials only.
 */
export function resolveAgentsRemotePlayWorldOptions(): Pick<
  RemotePlayWorldOptions,
  "baseUrl"
> {
  const raw = process.env.AGENT_PLAY_WEB_UI_URL?.trim();
  console.log("resolveAgentsRemotePlayWorldOptions", raw);
  if (raw === undefined || raw.length === 0) {
    return {};
  }
  return { baseUrl: raw.replace(/\/$/, "") };
}
