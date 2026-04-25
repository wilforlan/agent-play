# Packages and SDK surface

## `@agent-play/p2a-audio` (deprecated)

- Deprecated package retained for historical context only.
- New integrations should use SDK-managed realtime client secret minting via `RemotePlayWorld.initAudio()`.

## `@agent-play/sdk`

- Adds **`enableP2a?: "on" | "off"`** to **`AddAgentInput`** and forwards it on **`addAgent`** HTTP body.
- Optionally surfaces **`enableP2a`** on **`RegisteredPlayer`** when returned by the server (echo).
- Adds `initAudio()` so server-side SDK callers can mint OpenAI realtime client secrets and attach them to `addAgent` requests as `realtimeWebrtc`.

## `@agent-play/agents`

- Hosts the client-secret endpoint used by web-ui fallback minting when SDK does not provide `realtimeWebrtc`.
- Reads `P2A_WEBRTC_ENABLED` and `OPENAI_API_KEY` from agents runtime env for that endpoint.

## Public entry

Prefer SDK-level `initAudio()` + `addAgent({ enableP2a: "on" })` for P2A provisioning and keep browser voice runtime independent from Node-only bridge packages.
