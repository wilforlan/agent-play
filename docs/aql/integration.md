# Integration guide

How to run AQL programmatically and how it maps to HTTP endpoints.

## Calling the engine

Import [`runAql`](../../packages/web-ui/src/app/playground/_lib/aql-engine.ts) from the playground module (same package as the UI):

```typescript
import { runAql } from "./_lib/aql-engine";
import type { AqlExecutionState } from "./_lib/aql-types";

const state: AqlExecutionState = {
  serverUrl: "https://your-host",
  mainNodeId: "<main-node-id>",
  sid: null, // or existing session id from POST /api/agent-play/session
  nodePasswordMaterial: "<hex from nodeCredentialsMaterialFromHumanPassphrase>",
  spaceCatalogId: null,
  spaceNodeId: null,
  spacePasswordMaterial: null,
  targetAmenityKind: null,
  targetAgentId: null,
  targetNodeId: null,
  timeoutMs: 8000,
  headers: {},
};

const result = await runAql({
  source: yourAqlSourceString,
  state,
});

// result.response — last SHOW / FETCH / SEND / INSPECT payload
// result.headers — last HTTP response headers from the runtime client
// result.nextState — updated sid, targets, headers, timeout
// result.diagnostics — parse, semantic, or runtime errors
```

The playground prepends `LET serverUrl = "..."`; embedders should do the same or avoid `$serverUrl` in scripts.

## Execution state

| Field | Role |
|-------|------|
| `serverUrl` | Base URL for `fetch` (`/api/...`) |
| `mainNodeId` | Main node id for intercom + inspect |
| `sid` | Agent Play session id (`?_sid=` on RPC); set by `CONNECT` or externally |
| `nodePasswordMaterial` | Hex string used as `x-node-passw` for node APIs |
| `spaceCatalogId` | Catalog space id after `USE SPACE NODE` |
| `spaceNodeId` | Space node id used for `x-node-id` on space-scoped RPCs |
| `spacePasswordMaterial` | Hex passphrase material for the space node |
| `targetAmenityKind` | `"shop"` \| `"supermarket"` \| `"car_wash"` after `USE AMENITY` |
| `targetAgentId` | Resolved agent player id after `USE AGENT NODE` |
| `targetNodeId` | Selected agent **node** id |
| `timeoutMs` | Used where the executor honors timeout |
| `headers` | Extra headers merged into outbound requests (via `WITH HEADER`) |

## Runtime client (`PlaygroundRuntimeClient`)

[`aql-runtime-client.ts`](../../packages/web-ui/src/app/playground/_lib/aql-runtime-client.ts) implements:

| Method | HTTP |
|--------|------|
| `ensureSession` | `POST /api/agent-play/session` |
| `fetchSnapshot` | `POST /api/agent-play/sdk/rpc?sid=…` — `op: "getWorldSnapshot"` |
| `fetchSessionDetails` | `GET /api/agent-play/session/details?sid=…&includeSnapshot=1&eventsLimit=50` |
| `inspectMainNode` | `GET /api/nodes` with `x-node-id`, `x-node-passw` |
| `sendIntercomCommand` | `POST /api/agent-play/sdk/rpc?sid=…` — `op: "intercomCommand"` (chat) |

Responses are JSON objects augmented with `__http.status` and `__http.headers` for diagnostics.

## Root key and validation

The playground validates the main node before Connect using `NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY`. Server-side node creation and validation follow [Node ID v1](../notes/node-id-v1-migration.md).

## Extending AQL

1. **Lexer** — Add keywords to `KEYWORDS` in [`aql-lexer.ts`](../../packages/web-ui/src/app/playground/_lib/aql-lexer.ts) if new reserved words are needed.
2. **Parser** — New statement kinds in [`aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts); extend [`AqlStatement`](../../packages/web-ui/src/app/playground/_lib/aql-types.ts).
3. **Validator** — Rules in [`aql-validator.ts`](../../packages/web-ui/src/app/playground/_lib/aql-validator.ts).
4. **Executor** — Behavior + HTTP mapping in [`aql-executor.ts`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts); add RPC helpers to the runtime client.
5. **Tests** — [`aql-engine.test.ts`](../../packages/web-ui/src/app/playground/_lib/aql-engine.test.ts), [`aql-autocomplete.test.ts`](../../packages/web-ui/src/app/playground/_lib/aql-autocomplete.test.ts).

Keep [`language-reference.md`](language-reference.md) and [Examples](examples.md) updated when grammar changes.

## SDK parity

For production automation (CI, servers), prefer **`RemotePlayWorld`** from [`@agent-play/sdk`](../../packages/sdk) — `connect`, `getWorldSnapshot`, intercom APIs — rather than reimplementing AQL. Use AQL when you want a **scriptable operator UI** aligned with the playground.
