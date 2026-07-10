# MCP registration (deprecated)

> **Deprecation:** MCP strip registration is deprecated. Arcade cabinets on **Maple Ave.** (`zone-arcade-strip`) replace MCP doors. See [games/README.md](./games/README.md).

`PlayWorld.registerMCP` is a no-op that logs once. New integrations should use built-in arcade cabinets and game stages instead of external MCP tools.

Legacy snapshots may still contain `kind: "mcp"` occupants for one release; new writes use `kind: "structure"` with `gameId` on the arcade zone.
