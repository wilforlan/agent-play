# Introduction to AQL

## What is AQL?

**Agent Query Language (AQL)** is a domain-specific language embedded in the Agent Play web UI. It lets operators and integrators:

- Align **connection context** (server URL, main node id, session id) with scripted steps.
- **Inspect** the authenticated main node (`GET /api/nodes`) and **agents** resolved from the live **world snapshot**.
- **Send** intercom traffic (chat / assist / realtime) to a targeted agent after selecting its node id.
- **Fetch** snapshot slices (occupants, metadata, full snapshot) and **show** the last HTTP response or headers for debugging.

AQL is **not** a general-purpose language: there are no loops, branches, or user-defined functions beyond **macros**.

## Mental model

```text
┌─────────────────┐     passphrase ──► nodePasswordMaterial (hex)
│ Connect (UI)    │──────────────────────────────────────────────► validated main node
└────────┬────────┘
         │ CONNECT SERVER … MAIN_NODE …  (optional script step; ensures session)
         ▼
┌─────────────────┐
│ Session (sid)   │◄─── FETCH SNAPSHOT / SEND / …
└────────┬────────┘
         │ USE AGENT NODE $targetNode  ──► resolves agent from snapshot
         ▼
┌─────────────────┐
│ targetAgentId   │◄─── SEND "…"
└─────────────────┘
```

1. **Main node**: Identity used for `INSPECT MAIN NODE` and for signing intercom calls. The playground derives **hashed passphrase material** from the **10-word phrase** using `@agent-play/node-tools/browser` (same material as API headers).
2. **Session**: Created via `POST /api/agent-play/session` when needed; reused when `CONNECT` runs again with an existing `sid` in state.
3. **Agent context**: `USE AGENT NODE <expr>` or `SHIFT AGENT NODE <expr>` sets `targetNodeId` and `targetAgentId` from the current snapshot. **`SEND` requires this context.**

## Design choices

- **Line-oriented statements** starting with a keyword (`LET`, `CONNECT`, `USE`, …).
- **Case-sensitive keywords** in the canonical grammar (the lexer recognizes uppercase keywords; see [Language reference](language-reference.md) for `WITH` clause flexibility).
- **Variables** with `$name`; **dotted paths** like `$agent.name` resolve nested snapshot fields when the value is an object.
- **Macros** (`MACRO` / `CALL`) for reusable fragments without external files.
- **Comments**: `#` to end of line.

## Relation to the SDK

The [`@agent-play/sdk`](../../packages/sdk) **`RemotePlayWorld`** client is the primary integration path for Node.js and long-running tools. AQL is complementary: it is **browser-first**, **session-scoped**, and optimized for **manual and scripted debugging** against the same snapshot and intercom stack documented in [Events, SSE, and Remote](../events-sse-and-remote.md) and the world model notes.

## Roadmap note

Future commands (for example space management) may be added to AQL and the runtime client; this documentation set will grow with the grammar. Check the [language reference](language-reference.md) against the parser source when in doubt.
