# OpenAI Realtime bridge

Agent Play now provisions OpenAI Realtime using SDK- and server-managed client secret minting. The legacy `@agent-play/p2a-audio` WebSocket bridge is deprecated.

## Secrets

- `**OPENAI_API_KEY**`: required in trusted server runtime (`packages/agents` and/or SDK server process) to mint ephemeral client secrets.
- `**P2A_WEBRTC_ENABLED=1**`: required in `packages/agents` when using the agents-side mint endpoint.
- Do not pass API keys through browser clients for this feature.

## Observability

- `**AGENT_PLAY_DEBUG=1**`: enables cross-stack debug logs for registration, minting, and intercom routing.
- Logs include `**requestId**`, `**playerId**`, event types, and **base64 lengths** only — never full `**dataBase64`**, API keys, or `**Authorization**` headers.

## Audio format

OpenAI Realtime expects **PCM** at the session sample rate (commonly **24 kHz mono**). Browser capture may use other containers (e.g. WebM/Opus); transcoding may be required before `input_audio_buffer.append` — document the chosen client encoding in play-ui / agents release notes when enforced.

## Session behavior (current)

`RemotePlayWorld.initAudio()` mints per-agent client secrets during `addAgent({ enableP2a: "on" })` and forwards `realtimeWebrtc` in the players registration payload. The browser uses that ephemeral key to connect to OpenAI Realtime directly.

## Deprecation note

`@agent-play/p2a-audio` is deprecated and should not be used in new integrations.