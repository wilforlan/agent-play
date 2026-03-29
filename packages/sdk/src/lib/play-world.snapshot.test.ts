import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import type { WorldJourneyUpdate } from "../@types/world.js";
import { WORLD_AGENT_SIGNAL_EVENT } from "./play-transport.js";

describe("PlayWorld snapshot and session", () => {
  it("isSessionSid matches only after start", async () => {
    const world = new PlayWorld({});
    await world.start();
    const sid = world.getSessionId();
    expect(world.isSessionSid(sid)).toBe(true);
    expect(world.isSessionSid("wrong")).toBe(false);
  });

  it("getSnapshotJson includes players and serializes dates in lastUpdate", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "a1",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool", "t1"] },
    });

    const startedAt = new Date("2025-01-01T00:00:00.000Z");
    const completedAt = new Date("2025-01-01T00:01:00.000Z");
    const journey = {
      steps: [
        {
          type: "origin" as const,
          content: "hi",
          messageId: "m1",
        },
        {
          type: "destination" as const,
          content: "bye",
          messageId: "m2",
        },
      ],
      startedAt,
      completedAt,
    };
    const structures = world.getSnapshotJson().players[0]?.structures ?? [];
    const update: WorldJourneyUpdate = {
      playerId: p.id,
      journey,
      path: [],
      structures,
    };
    world.recordJourney(p.id, journey);

    const snap = world.getSnapshotJson();
    expect(snap.sid).toBe(world.getSessionId());
    expect(snap.players).toHaveLength(1);
    expect(snap.players[0]?.name).toBe("a1");
    expect(snap.worldMap.structures.length).toBeGreaterThan(0);
    expect(snap.worldMap.bounds).toMatchObject({
      minX: expect.any(Number),
      minY: expect.any(Number),
      maxX: expect.any(Number),
      maxY: expect.any(Number),
    });
    expect(snap.players[0]?.type).toBe("langchain");
    const last = snap.players[0]?.lastUpdate;
    expect(last?.journey.startedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(last?.journey.completedAt).toBe("2025-01-01T00:01:00.000Z");
  });

  it("last journey wins for same player", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    const s1 = new Date("2025-01-01T00:00:00.000Z");
    const s2 = new Date("2025-01-02T00:00:00.000Z");
    world.recordJourney(p.id, {
      steps: [{ type: "origin", content: "a", messageId: "1" }],
      startedAt: s1,
      completedAt: s1,
    });
    world.recordJourney(p.id, {
      steps: [{ type: "origin", content: "b", messageId: "2" }],
      startedAt: s2,
      completedAt: s2,
    });
    const step0 = world.getSnapshotJson().players[0]?.lastUpdate?.journey.steps[0];
    expect(
      step0 && (step0.type === "origin" || step0.type === "destination")
        ? step0.content
        : null
    ).toBe("b");
  });

  it("getSnapshotJson includes mcpServers after registerMCP", async () => {
    const world = new PlayWorld({});
    await world.start();
    await world.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    world.registerMCP({ name: "demo", url: "http://127.0.0.1:9" });
    const snap = world.getSnapshotJson();
    expect(snap.mcpServers).toHaveLength(1);
    expect(snap.mcpServers?.[0]?.name).toBe("demo");
  });

  it("emits WORLD_AGENT_SIGNAL_EVENT for journey metadata", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool", "x"] },
    });
    let count = 0;
    world.on(WORLD_AGENT_SIGNAL_EVENT, () => {
      count += 1;
    });
    const s = new Date();
    world.recordJourney(p.id, {
      steps: [{ type: "origin", content: "x", messageId: "1" }],
      startedAt: s,
      completedAt: s,
    });
    expect(count).toBe(1);
  });
});
