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
        intercomAddress: "intercom-address://intercom:human:m1:agent:agent-p1",
      },
    });
    const publishMock = vi.mocked(store.publishWorldFanout);
    expect(publishMock).toHaveBeenCalledTimes(1);
    const payload = publishMock.mock.calls[0]?.[2] as {
      status?: string;
      intercomAddress?: string;
      result?: { messageKind?: string; message?: string };
    };
    expect(payload.status).toBe("completed");
    expect(payload.intercomAddress).toBe(
      "intercom-address://intercom:human:m1:agent:agent-p1"
    );
    expect(payload.result?.messageKind).toBe("text");
    expect(payload.result?.message).toBe("ok");
  });

  it("keeps audio result payload normalized as audio kind", async () => {
    const store = {
      getSnapshotRev: vi.fn(async () => 1),
      publishWorldFanout: vi.fn(async () => {}),
    } as unknown as SessionStore;
    const ts = new Date().toISOString();
    await handleIntercomResponse({
      store,
      payload: {
        requestId: "r2",
        mainNodeId: "m1",
        toPlayerId: "m1",
        fromPlayerId: "agent-p1",
        kind: "assist",
        status: "completed",
        ts,
        result: {
          audio: {
            encoding: "mp3",
            dataBase64: "Zm9v",
          },
        },
      },
    });
    const payload = vi.mocked(store.publishWorldFanout).mock.calls[0]?.[2] as {
      result?: { messageKind?: string; audio?: unknown };
    };
    expect(payload.result?.messageKind).toBe("audio");
    expect(payload.result?.audio).toBeDefined();
  });
});
