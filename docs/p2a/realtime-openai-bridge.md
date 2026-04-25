# OpenAI Realtime bridge (no LiveKit)

`@agent-play/p2a-audio` implements the [OpenAI Realtime WebSocket](https://platform.openai.com/docs/guides/realtime-websockets) protocol using the **`ws`** package and small internal helpers.

## Secrets

- **`OPENAI_API_KEY`**: required on the **agents** process when any registered agent uses **`enableP2a: "on"`**.
- Do not pass API keys through `RemotePlayWorld` from browser clients for this feature.

## Observability

- **`AGENT_PLAY_DEBUG=1`**: enables **`agentPlayDebug`** across the stack (including **`p2aAudioDebug`** in `@agent-play/p2a-audio`) and also enables **`p2aAudioTrace`** lines.
- **`P2A_AUDIO_TRACE=1`**: enables **`p2aAudioTrace`** only (high-volume per-event / per-delta lines prefixed `[agent-play:p2a-audio:trace]`) without turning on all SDK debug namespaces.
- Logs include **`requestId`**, **`playerId`**, event types, and **base64 lengths** only — never full **`dataBase64`**, API keys, or **`Authorization`** headers.

## Audio format

OpenAI Realtime expects **PCM** at the session sample rate (commonly **24 kHz mono**). Browser capture may use other containers (e.g. WebM/Opus); transcoding may be required before `input_audio_buffer.append` — document the chosen client encoding in play-ui / agents release notes when enforced.

## Session behavior (v1)

The bridge opens one Realtime WebSocket per **`enableP2a: "on"`** automation **`playerId`**. Each inbound **`AgentAudioEvent`** (PTT segment) appends audio to the buffer, commits, and requests a model response. Outbound audio deltas are sent as intercom **`status: "stream"`**; a final **`status: "completed"`** includes **`result.audio.dataBase64`** with the **concatenated PCM** from all deltas so the watch UI can attach one playable clip. Incremental **`stream`** payloads can still drive status text or future live playback.

## Protocol drift

Centralize event parsing in `@agent-play/p2a-audio` so OpenAI wire changes touch one module and its tests.
