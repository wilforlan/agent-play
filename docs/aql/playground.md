# Node Playground (`/playground`)

The **Node Playground** is a gated Next.js route that ships with `@agent-play/web-ui`. It provides:

- Connection controls (**Server URL**, **Main node ID**, **10-word passphrase**)
- An **AQL** editor with autocomplete
- **Run** execution with diagnostics
- **Response** and **HTTP headers** panels

## Enabling the route

Set:

```bash
NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND=true
```

(or `1`) in the web UI environment. If disabled, `/playground` renders instructions instead of the editor.

Implementation: [`packages/web-ui/src/app/playground/page.tsx`](../../packages/web-ui/src/app/playground/page.tsx).

## Connection workflow

1. **Server URL** — Defaults to the browser origin when `NEXT_PUBLIC_SITE_ORIGIN` is empty (see client [`playground-client.tsx`](../../packages/web-ui/src/app/playground/playground-client.tsx)).
2. **Main node ID** — Your deployed **main** node identifier. Changing this field rewrites the `LET mainNode = "..."` line in the editor when present.
3. **Passphrase** — Exactly **10 words** (whitespace-separated). The UI derives **hex credential material** via `nodeCredentialsMaterialFromHumanPassphrase` from [`@agent-play/node-tools/browser`](../../packages/node-tools/src/browser.ts).
4. **Connect** — Calls `POST /api/nodes/validate` with `nodeId` + `rootKey` (`NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY`), then `POST /api/agent-play/session`. On success, execution state holds `sid` and `nodePasswordMaterial`.
5. **Disconnect** — Clears session and agent targets; resets UI state.

**Execute vs Connect:** Passing validation is required before **Run** can call APIs that need secrets (`INSPECT MAIN NODE`, `SEND`). You may still edit AQL while disconnected.

## Run

**Run** prepends a synthetic line:

```aql
LET serverUrl = "<current Server URL field>"
```

to your script so `$serverUrl` is defined if referenced. It then calls [`runAql`](../../packages/web-ui/src/app/playground/_lib/aql-engine.ts) with the merged execution state.

Separate loading states:

- **Connecting** — validate + session
- **Running** — AQL execution only

## Status badge

The chip shows **ready** when a main node id and valid 10-word passphrase are present, **connected** after a successful Connect, and reflects disconnect otherwise.

## Headers inspector

Successful RPCs attach **`__http`** metadata in the runtime client; the playground strips it from JSON but displays response headers in a **collapsible** panel (pretty-printed).

## Autocomplete

[`aql-autocomplete.ts`](../../packages/web-ui/src/app/playground/_lib/aql-autocomplete.ts) suggests:

- Keywords (`INSPECT MAIN NODE`, `USE AGENT NODE`, `FETCH SNAPSHOT`, …)
- Variables from `LET` bindings
- Common paths (`$agent.name`, `$node.kind`, …)

**Tab** inserts the **first** suggestion when the menu is open.

## Limitations

- AQL runs **in the browser**; long-running or unattended automation usually belongs in the **SDK** ([Integration guide](integration.md)).
- **`SEND`** currently invokes **chat** intercom (`kind: "chat"` in [`aql-runtime-client.ts`](../../packages/web-ui/src/app/playground/_lib/aql-runtime-client.ts)).
