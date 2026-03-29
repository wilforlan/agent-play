/**
 * Interactive preview, Redis-backed agents, and HTTP/WebSocket APIs are implemented by
 * `@agent-play/web-ui` (Next.js). Run it with `npm run dev -w @agent-play/web-ui`.
 *
 * Point SDK clients at the same origin with `AGENT_PLAY_WEB_UI_URL` and use `RemotePlayWorld`
 * (see `01-langchain-minimal-invoke.ts`). The CLI talks to `/api/admin/agents` using
 * `AGENT_PLAY_SERVER_URL` and `AGENT_PLAY_ADMIN_KEY`.
 */

console.log(
  "Use packages/web-ui for the server, and RemotePlayWorld in the SDK examples."
);
process.exit(0);
