# AQL language reference

This reference matches the implementation under `packages/web-ui/src/app/playground/_lib/`.

## Lexical rules

- **Whitespace** separates tokens; newlines end statements.
- **Comments**: `#` starts a comment; the rest of the line is ignored.
- **Keywords**: See lexer `KEYWORDS` in [`aql-lexer.ts`](../../packages/web-ui/src/app/playground/_lib/aql-lexer.ts). Identifiers and keywords are distinct; statements must begin with a keyword token where required.
- **Strings**: Double-quoted (`"..."`). Escape `\"` and `\\` inside strings.
- **Numbers**: Parsed as JavaScript numbers (integers and floats).
- **Variables**: `$` followed by letters, digits, `_`, and **`.`** for dotted paths (e.g. `$agent.metadata.foo`).
- **Symbols**: `=`, parentheses `(` `)`, commas `,`.

### Case sensitivity

Statement keywords are matched as uppercase in the lexer set. For **`WITH`**, the parser also accepts **`header`** / **`timeout`** as identifiers and normalizes them to `HEADER` / `TIMEOUT` so lowercase clauses work.

## Expressions

| Form | Meaning |
|------|---------|
| `"text"` | String literal |
| `123` | Number literal |
| `$var` | Variable reference |
| `$obj.field` | Dotted resolution (each segment drills into objects; missing paths yield **undefined** behavior at runtime if intermediate is not an object) |

There are no arithmetic or boolean operators in expressions.

## Statements (overview)

Statements run **in order**. Some update **execution state** (`CONNECT`, `USE AGENT NODE`, `WITH TIMEOUT`, …); others read/write **variables** or **outputs** (`LET`, `FETCH`, `SHOW`, …).

### `LET`

```aql
LET name = expr
```

Binds `name` for later `$name` references in the same program (after the `LET`). Validator rejects references to undefined variables.

### `CONNECT SERVER … MAIN_NODE …`

```aql
CONNECT SERVER expr MAIN_NODE expr
```

Updates `serverUrl` and `mainNodeId` in execution state. If `sid` is already set, **does not** create a new session; returns a small payload noting `reusedSession: true`. Otherwise calls `ensureSession()` (`POST /api/agent-play/session`) and stores `sid`.

**Note:** Main-node **passphrase material** is **not** set by this statement; the playground **Connect** form derives it and merges it into state before `runAql` runs. For embedders, set `nodePasswordMaterial` on state when calling `runAql` (see [Integration guide](integration.md)).

### `INSPECT MAIN NODE`

Calls `GET /api/nodes` with `x-node-id` / `x-node-passw` from `mainNodeId` and `nodePasswordMaterial`. Sets variable **`mainNode`** to the JSON body; updates last response and headers.

**Requires:** non-empty `mainNodeId`, non-null `nodePasswordMaterial` (set outside AQL in the playground).

### `INSPECT AGENT NODE`

Loads the world snapshot and resolves the agent **currently selected** by `USE AGENT NODE` / `SHIFT AGENT NODE` (`targetNodeId`). Sets variable **`node`** to that agent’s occupant record.

**Requires:** session (`sid`) and prior **`USE AGENT NODE`** (so `targetNodeId` is set).

### `INSPECT AGENT`

Same snapshot resolution as above but sets variable **`agent`** and focuses on the current agent context.

**Requires:** session and **`USE AGENT NODE`**.

### `USE AGENT NODE` / `SHIFT AGENT NODE`

```aql
USE AGENT NODE expr
SHIFT AGENT NODE expr
```

Evaluates `expr` to a **node id string**, fetches the snapshot, resolves the matching agent occupant, and sets:

- `targetNodeId`, `targetAgentId`
- variable **`agent`** to the resolved node payload

`SHIFT` requires an existing agent context (`USE` must have run first).

### `SEND`

```aql
SEND expr
```

Evaluates `expr` to the message / payload string (depending on intercom wiring). **Semantic rule:** `USE AGENT NODE` must appear earlier in the program so the validator sets “has agent target.”

**Requires:** session, `mainNodeId`, `nodePasswordMaterial`, and agent context from `USE` / `SHIFT`.

### `WITH HEADER` / `WITH TIMEOUT`

```aql
WITH HEADER keyExpr = valueExpr
WITH TIMEOUT msExpr
```

`WITH HEADER` merges into per-request headers map. `WITH TIMEOUT` sets milliseconds for subsequent operations that honor timeout (must be a positive number when literal).

### `FETCH`

```aql
FETCH OCCUPANTS
FETCH METADATA
FETCH SNAPSHOT
```

Fetches via the runtime client using the current `sid`. Populates internal outputs; use `SHOW RESPONSE` to surface.

**Requires:** session.

### `SHOW`

```aql
SHOW RESPONSE
SHOW HEADERS
SHOW expr
```

- **`SHOW expr`**: Evaluates the expression and assigns the result to the execution output’s **last response** (what the playground displays after a successful run).
- **`SHOW RESPONSE`** / **`SHOW HEADERS`**: No-op statements in the current executor; they exist so you can end a script without overwriting the last payload. The **last substantive statement** (e.g. `FETCH`, `SEND`, `INSPECT`) still determines `lastResponse` unless you finish with **`SHOW expr`**.

### `INTO`

```aql
INTO name
```

Copies the current **last response** into an internal named map under `name`. Useful when chaining operations and capturing an intermediate result (the playground UI still surfaces the final `lastResponse` from [`executeAqlProgram`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts)).

### `MACRO` / `CALL`

```aql
MACRO name(param1, param2 = defaultExpr) {
  statement
  …
}
CALL name(arg1, arg2)
```

Defines reusable statement lists. Parameters are optional with defaults. Nested macros follow validator scoping rules (macro bodies see parameters plus outer `LET` bindings captured at definition time per implementation).

### `RETURN`

```aql
RETURN expr
```

Returns a value from a macro body (see executor).

## Validation errors (semantic)

| Code | Typical cause |
|------|----------------|
| `AQL_SEMANTIC_ERROR` | Undefined variable; `SEND` without `USE AGENT NODE`; duplicate macro; bad macro arity; non-positive `WITH TIMEOUT` literal |

Parse errors use codes such as **`AQL_PARSE_ERROR`** with a message pointing at the offending token.

## Runtime errors

Prefixed with **`AQL_RUNTIME_ERROR:`** — for example missing `CONNECT` before `FETCH`, missing passphrase material for `INSPECT MAIN NODE`, or missing agent context.

## Autocomplete (playground)

The editor suggests keywords and known variables (`LET` bindings and common `$agent.*` / `$node.*` paths). **Tab** accepts the first suggestion (see [Playground](playground.md)).
