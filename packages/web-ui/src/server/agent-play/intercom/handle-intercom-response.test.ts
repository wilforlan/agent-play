import { describe, expect, it, vi } from "vitest";
import { handleIntercomResponse } from "./handle-intercom-response.js";
import type { SessionStore } from "../session-store.js";

describe("handleIntercomResponse", () => {
  it("publishes world intercom event from validated payload", async () => {
    const store = {
      getSnapshotRev: vi.fn(async () => 1),
      publishWorldFanout: vi.fn(async () => {}),
    } as unknown as SessionStore;
    const ts = new Date().toISOString();
    await handleIntercomResponse({
      store,
      payload: {
        requestId: "r1",
        mainNodeId: "m1",
        toPlayerId: "m1",
        fromPlayerId: "agent-p1",
        kind: "chat",
        status: "completed",
        ts,
        result: { message: "ok" },
      },
    });
    const publishMock = vi.mocked(store.publishWorldFanout);
    expect(publishMock).toHaveBeenCalledTimes(1);
    const payload = publishMock.mock.calls[0]?.[2] as { status?: string };
    expect(payload.status).toBe("completed");
  });
});
