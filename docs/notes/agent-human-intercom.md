# Agent-Human Intercom Architecture

This note describes how chat and assist traffic flows between the browser human client and SDK-backed agents, using `packages/intercom` as the single protocol source, a **forwarding-only** web UI adapter, and strict `requestId` correlation.

## Package ownership

- **`packages/intercom`**: contracts, Zod validation, channel key helpers, channel open/reuse state, and wire constants (`intercomCommand`, `intercomResponse`, `createHumanNode`, `world:intercom`).
- **`packages/agents`**: tool handlers live under `packages/agents/src/tool-handlers/cfo` and `packages/agents/src/tool-handlers/sales-ai`. Legacy `packages/agents/src/intercom/execute-tool-capability.ts` re-exports the shared executor for compatibility.
- **`packages/web-ui`**: validates RPC payloads, opens/reuses intercom channels, **does not execute agent tools on the server**, fans out `world:intercom` events, and accepts `intercomResponse` from the SDK.
- **`packages/sdk`**: `RemotePlayWorld.subscribeIntercomCommands` listens for `forwarded` commands on SSE, runs a caller-supplied `executeTool` (typically `executeToolCapability` from `@agent-play/agents`), and posts `intercomResponse`.

## Human node (kind main)

- One reusable **human node** per human after explicit consent.
- Browser first-run UX is **citizen induction** before the world shell: an opaque full-stage passport flow (**Become a citizen** / restore / quiet guest path) with forced recovery-key backup on create. After enter, an in-world quest coach teaches watch screen → touch controls → play pad → wallet chip → meet agent → Maple arcade, then a Day-1 citizen card with Econext CTA for citizens. Coach **Dismiss** hides tips for the rest of the tour (progress still tracks); **Next** advances a step.
- Wire create path is unchanged: `createHumanNode` RPC with `{ consent: true, nodeId, passwHash }`, server persists via `createNodeAccount` when a repository is available.
- Credentials: `sessionStorage` (`agent-play.humanCredentials`) plus `credentials.json` download; recovery key shown once. Continue after create requires download or “I saved my recovery key.”
- **Guest walk**: synthetic `session-*` / `preview-local-node` credentials (look around only — no earn / no chat). Honesty-labeled in UI.
- **Restore**: passport accepts an uploaded `credentials.json` (CLI or prior browser backup). The browser hashes the passphrase with **@agent-play/node-tools** and calls `POST /api/nodes/validate` with **`x-node-id`** / **`x-node-passw`** (no bootstrap fetch). The server checks derivation and compares `passwHash` to Redis before writing session credentials (no `createHumanNode` RPC).
- Quest progress: `localStorage` key `agent-play:arrival-quest:v2` (`packages/play-ui/src/arrival-quest.ts`).
- `mainNodeId` in `intercomCommand` must match this node id. Use the same value for `fromPlayerId` (not `__human__`) so the agent’s `intercomResponse` targets the human node and the watch UI receives completions.

## Channel keys

Canonical pair for addressing:

- Human side: `encodeHumanStableKeyForIntercom(humanNodeId)` → trimmed main node id (genesis hash string).
- Agent side: `agentStableKeyFromToPlayerId(toPlayerId)` → `agent:<id>` when bare ids are used; the channel key uses one `agent:` segment with the id after stripping a leading `agent:` from the stable key.
- `buildIntercomChannelKey({ humanNodeId, agentStableKey })` → `intercom:human:<humanNodeId>:agent:<agentId>`.

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
    "fromPlayerId": "<mainNodeId>",
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
    "toPlayerId": "<mainNodeId>",
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
| Human node missing | Finish Arrival Quest passport (citizen create/restore) or Guest walk; `getMainNodeIdForIntercom` must return a value. |
| `sessionStorage` cleared | Re-run onboarding or restore `credentials.json` into storage manually in dev. |
| Stable key mismatch | Align `toPlayerId` with occupant `agentId`; channel helper prefixes `agent:` when needed. |

## World chat room messaging

World chat (`worldChatPublish` / `worldChatHistory` / `worldChatReact`) is the shared room surface beside P2A:

- **Replies** — optional `parentRequestId` with max depth **2** (root → reply → reply-to-reply).
- **Reactions** — `love` / `thumbs_up` with `action: "set" | "cancel"` via `worldChatReact`.
- **Deep links** — `?message=<requestId>` (or `#msg=<requestId>`) highlights the row for ~2.5s on load.
- **Composer** — multiline input, 50-emoji picker, reply chip; panel edge-resize on viewports ≥900px.
- **P2A default** — human view setting `p2aEnabled` defaults to **on** (still toggleable).

## Files (reference)

- `packages/intercom/src/*`
- `packages/web-ui/src/server/agent-play/intercom/dispatch-command.ts`
- `packages/web-ui/src/server/agent-play/intercom/execute-agent-capability.ts`
- `packages/web-ui/src/server/agent-play/intercom/handle-intercom-response.ts`
- `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`
- `packages/play-ui/src/preview-session-interaction-panel.ts`
- `packages/play-ui/src/preview-global-chat-room.ts`
- `packages/play-ui/src/chat-composer.ts`
- `packages/play-ui/src/preview-human-onboarding.ts`
- `packages/sdk/src/lib/remote-play-world.ts`
