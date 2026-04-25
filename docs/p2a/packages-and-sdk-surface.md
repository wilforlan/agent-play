# Packages and SDK surface

## `@agent-play/p2a-audio`

- **Node-only** package: OpenAI Realtime WebSocket client + bridge from **`RegisteredPlayer.on("audio", …)`** to **`sendIntercomResponse`**.
- Depends on **`@agent-play/sdk`** for `RemotePlayWorld`, `AgentAudioEvent`, and related types.
- **Must not** appear in [`@agent-play/sdk` browser export](../../packages/sdk/package.json) dependency graph.

## `@agent-play/sdk`

- Adds **`enableP2a?: "on" | "off"`** to **`AddAgentInput`** and forwards it on **`addAgent`** HTTP body.
- Optionally surfaces **`enableP2a`** on **`RegisteredPlayer`** when returned by the server (echo).
- No import of `@agent-play/p2a-audio` from `browser` entry or shared code paths used by `browser`.

## `@agent-play/agents`

- Depends on **`@agent-play/p2a-audio`**.
- After **`addAgent`**, if **`enableP2a === "on"`** for a player, validates **`OPENAI_API_KEY`** and calls **`attachP2aAudioBridge`** (or equivalent) for that registration; **`onClose`** tears down bridges.

## Public entry

Prefer **`attachP2aAudioBridge`** exported from **`@agent-play/p2a-audio`** rather than growing `RemotePlayWorld` with Node-only methods, unless a split Node-only SDK entry is introduced later.
