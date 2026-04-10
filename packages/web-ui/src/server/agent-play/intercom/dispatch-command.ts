import type { IntercomCommandPayload } from "./shared-intercom.js";
import { executeAgentCapability } from "./execute-agent-capability.js";
import { publishWorldIntercomEvent } from "./fanout.js";
import type { SessionStore } from "../session-store.js";

type PlayWorldLike = {
  recordInteraction: (input: {
    playerId: string;
    role: "user" | "assistant" | "tool";
    text: string;
  }) => Promise<unknown>;
};

export async function dispatchIntercomCommand(options: {
  store: SessionStore;
  world: PlayWorldLike;
  payload: IntercomCommandPayload;
}): Promise<void> {
  const { store, world, payload } = options;
  const now = new Date().toISOString();
  await publishWorldIntercomEvent({
    store,
    payload: {
      requestId: payload.requestId,
      mainNodeId: payload.mainNodeId,
      toPlayerId: payload.fromPlayerId,
      fromPlayerId: payload.toPlayerId,
      kind: payload.kind,
      status: "started",
      toolName: payload.toolName,
      ts: now,
    },
  });
  try {
    const { channelKey } = await executeAgentCapability({ world, payload });
    await publishWorldIntercomEvent({
      store,
      payload: {
        requestId: payload.requestId,
        mainNodeId: payload.mainNodeId,
        toPlayerId: payload.fromPlayerId,
        fromPlayerId: payload.toPlayerId,
        kind: payload.kind,
        status: "forwarded",
        toolName: payload.toolName,
        channelKey,
        command: payload,
        ts: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await publishWorldIntercomEvent({
      store,
      payload: {
        requestId: payload.requestId,
        mainNodeId: payload.mainNodeId,
        toPlayerId: payload.fromPlayerId,
        fromPlayerId: payload.toPlayerId,
        kind: payload.kind,
        status: "failed",
        toolName: payload.toolName,
        error: message,
        ts: new Date().toISOString(),
      },
    });
    throw error;
  }
}
