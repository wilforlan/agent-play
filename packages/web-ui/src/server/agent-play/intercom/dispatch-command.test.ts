import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchIntercomCommand } from "./dispatch-command.js";
import type { SessionStore } from "../session-store.js";

const mkStore = () =>
  ({
    getSnapshotRev: vi.fn(async () => 7),
    publishWorldFanout: vi.fn(async () => {}),
  }) as unknown as SessionStore;

describe("dispatchIntercomCommand", () => {
  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
        fromPlayerId: "main-1",
        toPlayerId: "agent-1",
        kind: "chat",
        text: "hello",
        intercomAddress: "ap-intercom://main-1",
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
      intercomAddress?: string;
    };
    expect(firstPayload.status).toBe("started");
    expect(secondPayload.status).toBe("forwarded");
    expect(secondPayload.command?.requestId).toBe("req-1");
    expect(secondPayload.intercomAddress).toBe("ap-intercom://main-1");
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
          fromPlayerId: "main-1",
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

  it("forwards third-party protocol addresses unchanged", async () => {
    const store = mkStore();
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };
    await dispatchIntercomCommand({
      store,
      world,
      payload: {
        requestId: "req-3",
        mainNodeId: "main-1",
        fromPlayerId: "main-1",
        toPlayerId: "agent-1",
        kind: "chat",
        text: "hello",
        intercomAddress:
          "gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2",
      },
    });
    const forwardedPayload = vi.mocked(store.publishWorldFanout).mock.calls[1]?.[2] as {
      intercomAddress?: string;
      channelKey?: string;
    };
    expect(forwardedPayload.intercomAddress).toBe(
      "gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2"
    );
    expect(forwardedPayload.channelKey).toBe(
      "intercom:human:6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2:agent:agent-1"
    );
  });

  it("publishes started and forwarded for realtime command and waits for agent response", async () => {
    const store = mkStore();
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };
    await dispatchIntercomCommand({
      store,
      world,
      payload: {
        requestId: "req-rt",
        mainNodeId: "main-1",
        fromPlayerId: "main-1",
        toPlayerId: "agent-1",
        kind: "realtime",
      },
    });
    const publishMock = vi.mocked(store.publishWorldFanout);
    const forwardedPayload = publishMock.mock.calls[1]?.[2] as {
      status?: string;
      command?: { kind?: string };
    };
    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(forwardedPayload.status).toBe("forwarded");
    expect(forwardedPayload.command?.kind).toBe("realtime");
  });
});
