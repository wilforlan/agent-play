# MCP registration (Node)

From Node, call **`PlayWorld.registerMCP({ name, url? })`**. It returns a stable id and appends a row to the in-memory list for the session.

**Snapshot:** `getSnapshotJson()` may include **`mcpServers`**: `{ id, name, url? }[]` when at least one registration exists.

Persistence of MCP metadata through a repository layer is optional for future work; v1 keeps registrations in the `PlayWorld` instance only.
