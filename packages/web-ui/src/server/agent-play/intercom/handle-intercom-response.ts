import { parseIntercomResponsePayload } from "./shared-intercom.js";
import { publishWorldIntercomEvent } from "./fanout.js";
import type { SessionStore } from "../session-store.js";

export async function handleIntercomResponse(options: {
  store: SessionStore;
  payload: unknown;
}): Promise<void> {
  const p = parseIntercomResponsePayload(options.payload);
  await publishWorldIntercomEvent({
    store: options.store,
    payload: {
      requestId: p.requestId,
      mainNodeId: p.mainNodeId,
      toPlayerId: p.toPlayerId,
      fromPlayerId: p.fromPlayerId,
      kind: p.kind,
      status: p.status,
      toolName: p.toolName,
      message: p.message,
      result: p.result,
      error: p.error,
      ts: p.ts,
    },
  });
}
