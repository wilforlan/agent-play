# MCP registration (Node)

From Node, call **`await PlayWorld.registerMCP({ name, url? })`**. It returns a stable id and appends a **`kind: "mcp"`** occupant to the session snapshot in the configured session store (Redis or **`MemorySessionStore`**).

**Snapshot:** MCP servers appear in **`worldMap.occupants`** with **`kind: "mcp"`**. The optional top-level **`mcpServers`** field may still be present in older snapshots or when merged by the SDK from HTTP responses; new server writes use occupants only.

Persistence of MCP metadata through a repository layer is optional for future work; registrations are tied to the session snapshot in the store.
