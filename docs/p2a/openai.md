# OpenAI Realtime SDK Cutover

This note documents the codebase-wide cutover to OpenAI Realtime SDK primitives in the browser, with manual `RTCPeerConnection` usage deprecated in web UI runtime paths.

## What changes in web-ui

- Browser voice runtime no longer owns SDP exchange against `https://api.openai.com/v1/realtime/calls`.
- Manual peer lifecycle code (`createOffer`, `setLocalDescription`, POST SDP, `setRemoteDescription`) is deprecated in favor of `@openai/agents/realtime`.
- The interaction panel depends on `RealtimeAgent` + `RealtimeSession` as the single browser voice runtime.
- `preparePushToTalkConnection()` and `closeVoiceConnection()` stay as panel-facing APIs, but internally route to Realtime SDK session connect/disconnect.
- Canvas vendor runtime mirrors the same behavior to keep preview parity.

## Web-ui integration pattern (same as existing infra)

The cutover keeps the current infrastructure pattern intact: transport and snapshot plumbing stay the same, only the browser voice engine changes.

1. `packages/sdk` and/or `packages/agents` mint ephemeral credentials and include `realtimeWebrtc` in agent registration output.
   - During mint, persona inputs are resolved from registration context:
     - `agentName` from `addAgent({ name })`
     - `instructions` from explicit OpenAI audio options (`initAudio`) and/or instructions template expansion.
2. `packages/web-ui` players API keeps acting as a transport layer and forwards `realtimeWebrtc` without taking ownership of OpenAI key logic.
3. Snapshot loading in UI runtime keeps the same mapping flow:
   - snapshot occupant data -> normalized agent rows (including `enableP2a` and `realtimeWebrtc`)
   - rows -> session panel `setAgents(...)`
   - panel in-memory `agentsById` lookup -> voice preflight/connect
   - personal intercom address fallback uses `ap-intercom://{human_node_id}` instead of a world-global channel URI
4. P-key orchestration and proximity lifecycle stay in existing main-loop/panel boundaries; only connection internals move to Realtime SDK.

This means web-ui behavior remains aligned with existing app architecture: state is snapshot-driven, voice credentials are runtime in-memory values, and panel public APIs stay stable.

## How `@openai/agents/realtime` is used in web-ui

- Agent identity and persona are carried into browser runtime from the existing agent row/session context:
  - `name` from registered agent metadata (same source used for panel target labels)
  - `instructions` from server/SDK resolved OpenAI audio configuration
- Browser runtime composes Realtime SDK objects with those values:
  - `RealtimeAgent({ name, instructions })`
  - `RealtimeSession({ model: realtimeWebrtc.model, ... })`
  - `session.connect({ apiKey: realtimeWebrtc.clientSecret })`
- This preserves the current infrastructure contract: persona definition is owned by trusted runtime (`sdk`/`agents`), while `web-ui` consumes already-resolved values.

## End-to-end architecture after cutover

1. Server-side trusted runtime (SDK process and/or `packages/agents`) mints ephemeral OpenAI client secrets.
2. `RemotePlayWorld.initAudio()` configures OpenAI options once; `addAgent({ enableP2a: "on" })` attaches `realtimeWebrtc`.
3. `web-ui` players route transports `realtimeWebrtc` payload and does not own OpenAI API key usage.
4. Browser receives `realtimeWebrtc` and builds Realtime SDK runtime objects:
   - create `RealtimeAgent` with `name` + `instructions` from resolved agent persona config
   - create `RealtimeSession` with `realtimeWebrtc.model`
   - connect with `apiKey: realtimeWebrtc.clientSecret`
5. Proximity change and panel mode transitions close/recreate the SDK session as needed.

## Intercom and command contract impact

- Intercom command handling is now scoped to `assist` and `chat`.
- `kind: "audio"` command flow is removed from active SDK/intercom runtime paths.
- Push-to-talk depends on realtime credentials for direct OpenAI voice sessions, not intercom audio fallback.
- Intercom addressing is personal and protocol-aware:
  - first-party canonical format: `ap-intercom://{node_id}`
  - third-party namespaces are supported when needed (example: `gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2`)

## Package-level impact summary

- `packages/play-ui`
  - Uses Realtime SDK path for browser voice lifecycle.
  - Removes manual WebRTC fallback semantics from active PTT flow.
- `packages/web-ui`
  - Vendor panel/runtime copy mirrors `play-ui` Realtime SDK behavior.
  - API routes remain transport-oriented for registration payloads.
- `packages/sdk`
  - `initAudio()` + `addAgent()` carry OpenAI realtime metadata to UI.
  - Audio-listener style APIs tied to intercom audio commands are removed/deprecated.
- `packages/agents`
  - Owns trusted envs and optional mint endpoint (`P2A_WEBRTC_ENABLED`, `OPENAI_API_KEY`).
- `packages/intercom`
  - Validators and kinds align with non-audio command flow (`assist`, `chat`).

## Operational expectations

- `enableP2a: "on"` still gates whether a target agent is voice-capable.
- Missing or invalid `realtimeWebrtc.clientSecret` yields explicit UX errors in panel preflight.
- Browser bundles avoid Node-only imports while using `@openai/agents/realtime`.

## Migration note

For integrations already using `realtimeWebrtc` from registration payloads, wire shape remains stable; the browser implementation changes internally from manual WebRTC plumbing to Realtime SDK session management.
