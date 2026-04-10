import { describe, expect, it, vi } from "vitest";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld presence lease", () => {
  it("removes agent occupant when lease expires", async () => {
    vi.useFakeTimers();
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "lease-agent",
      connectionId: "conn-1",
      leaseTtlSeconds: 1,
    });
    expect(
      (await w.getSnapshotJson()).worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === "lease-agent"
      )
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(4_000);

    expect(
      (await w.getSnapshotJson()).worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === "lease-agent"
      )
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(
      (await w.getSnapshotJson()).worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === "lease-agent"
      )
    ).toBe(false);
    vi.useRealTimers();
  });

  it("keeps agent occupant alive when heartbeat renews lease", async () => {
    vi.useFakeTimers();
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "lease-agent-2",
      connectionId: "conn-2",
      leaseTtlSeconds: 20,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await w.heartbeatPlayerConnection({
      playerId: "lease-agent-2",
      connectionId: "conn-2",
      leaseTtlSeconds: 20,
    });

    await vi.advanceTimersByTimeAsync(10_000);

    expect(
      (await w.getSnapshotJson()).worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === "lease-agent-2"
      )
    ).toBe(true);
    vi.useRealTimers();
  });
});
