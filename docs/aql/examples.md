# AQL examples

Replace placeholders with real ids from your deployment. In the playground, **Connect** first so `sid` and passphrase material are set.

## Minimal: inspect main node

```aql
INSPECT MAIN NODE
SHOW RESPONSE
```

Requires Connect form to have validated the main node (sets `nodePasswordMaterial`).

## Session + snapshot

```aql
CONNECT SERVER "https://play.example.com" MAIN_NODE "your-main-node-id"
FETCH SNAPSHOT
SHOW RESPONSE
```

If you already have a session from the UI, `CONNECT` may report `reusedSession: true`.

## Target an agent and send chat

```aql
LET targetNode = "agent-node-id-uuid"

USE AGENT NODE $targetNode
WITH TIMEOUT 8000
SEND "Hello from AQL"
SHOW RESPONSE
SHOW HEADERS
```

`USE AGENT NODE` resolves the occupant in the current world snapshot; the agent must be present.

## Inspect agent fields

```aql
USE AGENT NODE "agent-node-id"
INSPECT AGENT
SHOW $agent.name
```

Dotted paths walk object properties when the snapshot exposes them.

## Shift context between agents

```aql
USE AGENT NODE "first-agent-node"
INSPECT AGENT

SHIFT AGENT NODE "second-agent-node"
SEND "Ping second agent"
SHOW RESPONSE
```

## Macro wrapping repeated steps

```aql
MACRO pingAgent(nodeExpr) {
  USE AGENT NODE $nodeExpr
  SEND "ping"
  SHOW RESPONSE
}

LET n = "your-agent-node-id"
CALL pingAgent($n)
```

## Fetch occupants slice

```aql
FETCH OCCUPANTS
SHOW RESPONSE
```

Returns occupant-related JSON derived from the snapshot RPC (see executor for exact shaping).

## Custom header on downstream RPCs

```aql
WITH HEADER "x-custom" = "demo"
FETCH METADATA
SHOW RESPONSE
```

Headers accumulate on `AqlExecutionState.headers` for statements that forward them (per executor).

## Comments

```aql
# Lines starting with # are comments
LET x = "ok"
SHOW $x
```
