# P2A wire contracts

## Add agent registration

`POST /api/agent-play/players` accepts an optional field:

- **`enableP2a`**: `"on"` | `"off"`. When omitted, treated as **`"off"`** for backward compatibility.

The SDK [`AddAgentInput`](../../packages/sdk/src/public-types.ts) includes **`enableP2a?: "on" | "off"`** and forwards it on the JSON body. The response may echo **`enableP2a`** on the registered player payload for clients that need to display state (optional; session-local echo).

Persistence in Redis/repository for `enableP2a` is not required for the agents-side bridge: the automation client that called `addAgent` is the source of truth for whether it attached a realtime bridge.

## Intercom audio

- **Inbound**: `world:intercom` with `status: "forwarded"` and `command.kind === "audio"` (see `@agent-play/intercom` validators). The SDK [`subscribeIntercomCommands`](../../packages/sdk/src/lib/remote-play-world.ts) dispatches to per-player **`audio`** listeners when registered.
- **No handler**: if there are no **`audio`** listeners for the target player, the SDK posts **`intercomResponse`** with **`status: "failed"`** and error **`P2A_AUDIO_NOT_ENABLED`** (constant **`INTERCOM_P2A_AUDIO_NOT_ENABLED`** in `@agent-play/sdk`). Audio is **not** routed through **`chat_tool`**.
- **Outbound**: `intercomResponse` with `kind: "audio"` and `status: "stream"` (incremental) then **`completed`**, correlated by **`requestId`**, **`fromPlayerId`**, **`toPlayerId`**, **`mainNodeId`**.

Payload shapes must stay compatible with [`IntercomResponsePayload`](../../packages/intercom/src/validator.ts) and play-ui handling of `stream` vs `completed`.

## Watch UI gating

World snapshot agent occupants include **`enableP2a`** (`"on"` | `"off"`) when serialized from the play server. The watch UI uses **`enableP2a === "on"`** on the proximity target to allow push-to-talk (key **P**) and the session panel PTT controls; otherwise it shows a blocking message or modal instead of sending audio.

## Secrets

`OPENAI_API_KEY` is read only in the **Node agents host** environment, not on the add-agent HTTP body.

## WebRTC client secret (per-agent)

When **`P2A_WEBRTC_ENABLED=1`** and agent registration uses **`enableP2a: "on"`**, the players route may mint and return:

- **`realtimeWebrtc.clientSecret`** (ephemeral client secret)
- optional **`realtimeWebrtc.expiresAt`**
- chosen **`realtimeWebrtc.model`** / **`voice`**

This payload can be echoed through SDK `addAgent` responses to browser clients for direct OpenAI Realtime WebRTC setup. The browser must never receive `OPENAI_API_KEY`; only short-lived client secrets are exposed.
