import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import { WORLD_INTERACTION_EVENT } from "./play-transport.js";

describe("PlayWorld recordInteraction", () => {
  it("throws for unknown playerId", async () => {
    const world = new PlayWorld({});
    await world.start();
    expect(() =>
      world.recordInteraction({
        playerId: "missing",
        role: "user",
        text: "hi",
      })
    ).toThrow(/unknown playerId/);
  });

  it("emits WORLD_INTERACTION_EVENT with monotonic seq", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    const payloads: unknown[] = [];
    world.on(WORLD_INTERACTION_EVENT, (payload) => {
      payloads.push(payload);
    });
    world.recordInteraction({
      playerId: p.id,
      role: "user",
      text: "hello",
    });
    world.recordInteraction({
      playerId: p.id,
      role: "assistant",
      text: "hi there",
    });
    expect(payloads).toHaveLength(2);
    const a = payloads[0] as { seq: number; role: string };
    const b = payloads[1] as { seq: number; role: string };
    expect(a.seq).toBeLessThan(b.seq);
    expect(a.role).toBe("user");
    expect(b.role).toBe("assistant");
  });

  it("includes recentInteractions in snapshot and caps length", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    for (let i = 0; i < 25; i += 1) {
      world.recordInteraction({
        playerId: p.id,
        role: "user",
        text: `m${i}`,
      });
    }
    const snap = world.getSnapshotJson();
    const recent = snap.players[0]?.recentInteractions ?? [];
    expect(recent.length).toBe(20);
    expect(recent[0]?.text).toBe("m5");
    expect(recent[19]?.text).toBe("m24");
  });

  it("removePlayer clears interaction log", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    world.recordInteraction({ playerId: p.id, role: "user", text: "x" });
    await world.removePlayer(p.id);
    const p2 = await world.addPlayer({
      name: "p2",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    expect(world.getSnapshotJson().players[0]?.recentInteractions).toBeUndefined();
    world.recordInteraction({ playerId: p2.id, role: "user", text: "y" });
    expect(
      world.getSnapshotJson().players[0]?.recentInteractions
    ).toHaveLength(1);
  });
});
