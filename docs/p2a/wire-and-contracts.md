# P2A wire contracts

## Add agent registration

`POST /api/agent-play/players` accepts an optional field:

- **`enableP2a`**: `"on"` | `"off"`. When omitted, treated as **`"off"`** for backward compatibility.

The SDK [`AddAgentInput`](../../packages/sdk/src/public-types.ts) includes **`enableP2a?: "on" | "off"`** and forwards it on the JSON body. The response may echo **`enableP2a`** on the registered player payload for clients that need to display state (optional; session-local echo).

Persistence in Redis/repository for `enableP2a` is not required for the agents-side bridge: the automation client that called `addAgent` is the source of truth for whether it attached a realtime bridge.

## Intercom commands

- Supported command kinds are **`assist`** and **`chat`**.
- **`kind: "audio"`** is removed from active intercom command handling.
- Payload shapes must stay compatible with [`IntercomResponsePayload`](../../packages/intercom/src/validator.ts) and play-ui handling of `stream` vs `completed`.

## Intercom address protocol

- Canonical first-party personal intercom URI is **`ap-intercom://{node_id}`**.
- The legacy global fallback value **`intercom-address://intercom:world:global`** is removed from runtime fallback flows.
- URI parsing is protocol-aware and accepts extensible namespaces that end in `-intercom` (for example **`gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2`**).
- Address value is treated as the personal node id used to derive intercom channel routing keys.

## Watch UI gating

World snapshot agent occupants include **`enableP2a`** (`"on"` | `"off"`) when serialized from the play server. The watch UI uses **`enableP2a === "on"`** on the proximity target to allow push-to-talk (key **P**) and the session panel PTT controls; otherwise it shows a blocking message or modal instead of sending audio.

## Secrets

`OPENAI_API_KEY` is read only in the **Node agents host** environment, not on the add-agent HTTP body.

## WebRTC client secret (per-agent)

When agent registration includes `realtimeWebrtc` and uses **`enableP2a: "on"`**, the players route forwards:

- **`realtimeWebrtc.clientSecret`** (ephemeral client secret)
- optional **`realtimeWebrtc.expiresAt`**
- chosen **`realtimeWebrtc.model`** / **`voice`**

This payload can be echoed through SDK `addAgent` responses to browser clients for direct OpenAI Realtime WebRTC setup. The browser must never receive `OPENAI_API_KEY`; only short-lived client secrets are exposed.
