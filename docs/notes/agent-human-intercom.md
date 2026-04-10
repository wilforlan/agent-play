# Agent-Human Intercom Architecture

This note describes how chat and assist traffic flows between the browser human client and SDK-backed agents, using `packages/intercom` as the single protocol source, a **forwarding-only** web UI adapter, and strict `requestId` correlation.

## Package ownership

- **`packages/intercom`**: contracts, Zod validation, channel key helpers, channel open/reuse state, and wire constants (`intercomCommand`, `intercomResponse`, `createHumanNode`, `world:intercom`).
- **`packages/agents`**: tool handlers live under `packages/agents/src/tool-handlers/cfo` and `packages/agents/src/tool-handlers/sales-ai`. Legacy `packages/agents/src/intercom/execute-tool-capability.ts` re-exports the shared executor for compatibility.
- **`packages/web-ui`**: validates RPC payloads, opens/reuses intercom channels, **does not execute agent tools on the server**, fans out `world:intercom` events, and accepts `intercomResponse` from the SDK.
- **`packages/sdk`**: `RemotePlayWorld.subscribeIntercomCommands` listens for `forwarded` commands on SSE, runs a caller-supplied `executeTool` (typically `executeToolCapability` from `@agent-play/agents`), and posts `intercomResponse`.

## Human node (kind main)

- One reusable **human node** per human after explicit consent.
- Browser flow: consent modal, `createHumanNode` RPC with `{ consent: true, passw }`, server persists via `createNodeAccount` when a repository is available.
- Credentials: `sessionStorage` (`agent-play.humanCredentials`) plus optional `credentials.json` download; passphrase shown once in onboarding.
- `mainNodeId` in `intercomCommand` must match this node id.

## Channel keys

Canonical pair for addressing:

- Human side: `encodeHumanStableKeyForIntercom(humanNodeId)` → JSON `{"__genesis__":"<humanNodeId>"}`.
- Agent side: `agentstableKeyFromToPlayerId(toPlayerId)` → `agent:<id>` when bare ids are used.
- `buildIntercomChannelKey({ humanNodeId, agentStableKey })` → `intercom:human:...:agent:...`.

`openOrReuseIntercomChannel` tracks lifecycle in-process for the server runtime.

## Forwarding-only server rule

`executeAgentCapability` records an audit line (`recordInteraction` user) and publishes `forwarded` with the original `command` echo. It **never** calls `executeToolCapability` or agent packages.

Completion comes from the SDK via `intercomResponse`, which publishes `stream` / `completed` / `failed` on `world:intercom`.

## RequestId contract

- Browser generates `requestId` per assist/chat action before RPC.
- Server echoes it on `started`, `forwarded`, and terminal events.
- SDK must preserve `requestId` in `intercomResponse`.
- UI patches rows by `requestId` only; events without a matching pending `requestId` go to diagnostics.

## Wire shapes

### Command (`intercomCommand`)

```json
{
  "op": "intercomCommand",
  "payload": {
    "requestId": "uuid",
    "mainNodeId": "…",
    "fromPlayerId": "__human__",
    "toPlayerId": "agent-player-id",
    "kind": "chat|assist",
    "toolName": "assist_cashflow_forecast",
    "args": {},
    "text": "…"
  }
}
```

### Forwarded (`world:intercom`)

Includes `status: "forwarded"`, `channelKey`, and `command` (original payload).

### SDK response (`intercomResponse`)

```json
{
  "op": "intercomResponse",
  "payload": {
    "requestId": "uuid",
    "mainNodeId": "…",
    "toPlayerId": "__human__",
    "fromPlayerId": "agent-player-id",
    "kind": "assist",
    "status": "completed|failed|stream",
    "toolName": "assist_cashflow_forecast",
    "result": {},
    "error": null,
    "ts": "iso-date"
  }
}
```

## Troubleshooting

| Symptom | Checks |
|--------|--------|
| Channel not opening | Verify `channelKey` in `forwarded` event; ensure `mainNodeId` matches human credentials. |
| Command forwarded, no completion | SDK must run `subscribeIntercomCommands` with correct `playerId`; agent must call `sendIntercomResponse`. |
| Missing/duplicate `requestId` patches | Ensure only one pending row per `requestId`; ignore stray SSE events without matching pending state. |
| SSE ok, panel not updating | Confirm `EventSource` listens on `world:intercom` and `applyIntercomEvent` receives raw JSON. |
| Human node missing | Finish onboarding or use Skip flow; `getMainNodeIdForIntercom` must return a value. |
| `sessionStorage` cleared | Re-run onboarding or restore `credentials.json` into storage manually in dev. |
| Stable key mismatch | Align `toPlayerId` with occupant `agentId`; channel helper prefixes `agent:` when needed. |

## Files (reference)

- `packages/intercom/src/*`
- `packages/web-ui/src/server/agent-play/intercom/dispatch-command.ts`
- `packages/web-ui/src/server/agent-play/intercom/execute-agent-capability.ts`
- `packages/web-ui/src/server/agent-play/intercom/handle-intercom-response.ts`
- `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`
- `packages/play-ui/src/preview-session-interaction-panel.ts`
- `packages/play-ui/src/preview-human-onboarding.ts`
- `packages/sdk/src/lib/remote-play-world.ts`
