# Troubleshooting AQL

## Parse errors (`AQL_PARSE_ERROR`)

| Symptom | Fix |
|---------|-----|
| `Expected keyword 'HEADER'` (older builds) | Use `WITH HEADER` / `WITH TIMEOUT`; ensure the parser sees `HEADER` or `TIMEOUT` after `WITH`. Current parser accepts case-normalized `header`/`timeout`. |
| `Unsupported keyword` | Check spelling; statements must use keywords defined in the lexer (see [Language reference](language-reference.md)). |
| String not closed | Escape embedded quotes: `\"`. |

## Semantic errors (`AQL_SEMANTIC_ERROR`)

| Message | Fix |
|---------|-----|
| `Variable 'x' is not defined` | Add `LET x = ...` **above** first use, or fix typo in `$x`. |
| `SEND requires USE AGENT NODE first` | Run `USE AGENT NODE …` before `SEND` in the same program (validator tracks agent targeting). |
| `WITH TIMEOUT must be a positive integer` | Use a numeric literal `> 0` or ensure expression resolves to one. |
| Macro arity errors | Match `CALL` argument count to `MACRO` parameters and defaults. |

## Runtime errors (`AQL_RUNTIME_ERROR`)

| Message | Fix |
|---------|-----|
| `main node is not set; run CONNECT first` | Set `mainNodeId` in state / playground, or run `CONNECT SERVER … MAIN_NODE …`. |
| `main-node passphrase material is missing` | In the playground, **Connect** with a valid 10-word phrase. In code, set `nodePasswordMaterial` on `AqlExecutionState`. |
| `run CONNECT before FETCH` / `USE AGENT NODE` | Obtain `sid` via Connect or `CONNECT` + `ensureSession`. |
| `run USE AGENT NODE before INSPECT AGENT` | Select agent context first. |
| `run USE AGENT NODE before SEND` | Same — `USE` or `SHIFT` must succeed for a snapshot-resolvable node id. |
| Node validation / HTTP failures | Check Server URL, TLS, CORS (browser), and that `/api/nodes/validate` accepts your `rootKey` + `nodeId`. |

## Playground-specific

| Symptom | Fix |
|---------|-----|
| `/playground` not available | Set `NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND=true`. |
| Connect fails validation | Confirm `NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY` matches deployment genesis; main node id matches Redis-recorded node. |
| Passphrase rejected | Must be **exactly 10 words** (non-empty tokens separated by whitespace). |
| Response panel empty | Last statement may be `SHOW RESPONSE` (no-op); ensure a prior `FETCH` / `SEND` / `INSPECT` / `SHOW $expr` produced output. |

## Debugging tips

1. Run **`FETCH SNAPSHOT`** then **`SHOW RESPONSE`** to confirm session and world snapshot visibility.
2. Use **`SHOW HEADERS`** after a call that populates HTTP metadata — inspect auth / caching issues.
3. Narrow **`WITH TIMEOUT`** when intercom feels slow; timeouts are enforced where the executor applies them.

For server-side world state, see [Redis world](../redis-world.md) and [Agent Play world model](../notes/agent-play-world-model-and-player-chain.md).
