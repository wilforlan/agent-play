import { describe, expect, it, vi } from "vitest";
import { dispatchIntercomCommand } from "./dispatch-command.js";
import type { SessionStore } from "../session-store.js";

const mkStore = () =>
  ({
    getSnapshotRev: vi.fn(async () => 7),
    publishWorldFanout: vi.fn(async () => {}),
  }) as unknown as SessionStore;

describe("dispatchIntercomCommand", () => {
  it("publishes started and forwarded events for chat command", async () => {
    const store = mkStore();
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };
    await dispatchIntercomCommand({
      store,
      world,
      payload: {
        requestId: "req-1",
        mainNodeId: "main-1",
        fromPlayerId: "__human__",
        toPlayerId: "agent-1",
        kind: "chat",
        text: "hello",
      },
    });
    expect(world.recordInteraction).toHaveBeenCalledWith({
      playerId: "agent-1",
      role: "user",
      text: "hello",
    });
    const publishMock = vi.mocked(store.publishWorldFanout);
    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(publishMock.mock.calls[0]?.[1]).toBe("world:intercom");
    const firstPayload = publishMock.mock.calls[0]?.[2] as { status?: string };
    const secondPayload = publishMock.mock.calls[1]?.[2] as {
      status?: string;
      command?: { requestId?: string };
    };
    expect(firstPayload.status).toBe("started");
    expect(secondPayload.status).toBe("forwarded");
    expect(secondPayload.command?.requestId).toBe("req-1");
  });

  it("publishes failed event when world execution throws", async () => {
    const store = mkStore();
    const world = {
      recordInteraction: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    await expect(
      dispatchIntercomCommand({
        store,
        world,
        payload: {
          requestId: "req-2",
          mainNodeId: "main-1",
          fromPlayerId: "__human__",
          toPlayerId: "agent-1",
          kind: "chat",
          text: "hello",
        },
      })
    ).rejects.toThrow("boom");
    const publishMock = vi.mocked(store.publishWorldFanout);
    expect(publishMock).toHaveBeenCalledTimes(2);
    const failedPayload = publishMock.mock.calls[1]?.[2] as {
      status?: string;
      error?: string;
    };
    expect(failedPayload.status).toBe("failed");
    expect(failedPayload.error).toContain("boom");
  });
});
