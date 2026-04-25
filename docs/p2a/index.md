# P2A realtime implementation hub

This folder documents **OpenAI Realtime** integration for Agent Play **without LiveKit**: a Node-only bridge in **`@agent-play/p2a-audio`** over intercom **`kind: "audio"`** and SSE, wired from **`packages/agents`**.

## Related product architecture

- [Agent Play P2A implementation architecture](../agent-play-p2a-implementation.md) — Ringer, assist tools, canvas UX (broader P2A product story).
- [Intercom-address architecture](../intercom-address.md) — `intercom-address://{channelKey}` routing.

## Per-agent flag

Enable realtime voice handling for a specific automation agent at registration time:

```ts
await world.addAgent({
  name: "…",
  type: "…",
  nodeId: "…",
  agent: langchainRegistration(agent),
  enableP2a: "on", // or "off" (default when omitted)
});
```

When **`enableP2a: "on"`**, the **agents process** that runs `subscribeIntercomCommands` must supply **`OPENAI_API_KEY`** (see [realtime-openai-bridge.md](./realtime-openai-bridge.md)). Keys are **never** sent from the browser for this path.

## Doc map

| Document | Contents |
|----------|----------|
| [wire-and-contracts.md](./wire-and-contracts.md) | `requestId`, intercom `stream` / `completed`, optional `enableP2a` on add-agent wire |
| [realtime-openai-bridge.md](./realtime-openai-bridge.md) | WebSocket client, PCM/base64, no LiveKit policy, secrets |
| [packages-and-sdk-surface.md](./packages-and-sdk-surface.md) | `@agent-play/p2a-audio` vs SDK vs agents; browser bundle constraints |

## High-level flow

```mermaid
flowchart LR
  subgraph client [PlayUI]
    PTT[PTT_audio_intercom]
  end
  subgraph web [WebUI]
    SSE[SSE_world_intercom]
    RPC[RPC_intercomResponse]
  end
  subgraph agents [packages_agents]
    Add[addAgent_enableP2a]
    Bridge["@agent-play/p2a-audio"]
    OAI[OpenAI_Realtime_WS]
  end
  PTT --> SSE
  SSE --> Bridge
  Add --> Bridge
  Bridge --> OAI
  Bridge --> RPC
  RPC --> SSE
```
