import { afterEach, describe, expect, it, vi } from "vitest";
import { attachLangChainInvoke } from "../platforms/langchain.js";
import { PlayWorld } from "./play-world.js";
import {
  WORLD_STRUCTURES_EVENT,
} from "./play-transport.js";
import { resetAgentPlayDebug } from "./agent-play-debug.js";

describe("PlayWorld syncPlayerStructuresFromTools", () => {
  afterEach(() => {
    resetAgentPlayDebug();
  });

  it("throws when playerId is unknown", async () => {
    const world = new PlayWorld({});
    await world.start();
    expect(() =>
      world.syncPlayerStructuresFromTools("nonexistent", ["a"])
    ).toThrow(/unknown playerId/);
  });

  it("updates snapshot structures and emits WORLD_STRUCTURES_EVENT", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "p",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    let events = 0;
    world.on(WORLD_STRUCTURES_EVENT, () => {
      events += 1;
    });
    world.syncPlayerStructuresFromTools(p.id, ["chat_tool", "alpha", "beta"]);
    const snap = world.getSnapshotJson();
    const toolNames = snap.players[0]?.structures
      .map((s) => s.toolName)
      .filter(Boolean);
    expect(toolNames).toContain("alpha");
    expect(toolNames).toContain("beta");
    expect(events).toBe(1);
    expect(snap.worldMap.structures.length).toBeGreaterThanOrEqual(3);
  });

  it("attachLangChainInvoke syncs structures from agent.tools", async () => {
    const world = new PlayWorld({});
    await world.start();
    const p = await world.addPlayer({
      name: "agent",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    const agent = {
      tools: [
        { name: "chat_tool" },
        { name: "search" },
        { name: "calculate" },
      ],
      invoke: async () => ({ messages: [] as unknown[] }),
    };
    attachLangChainInvoke(agent, world, p.id);
    const snap = world.getSnapshotJson();
    const names = snap.players[0]?.structures
      .map((s) => s.toolName)
      .filter(Boolean);
    expect(names).toContain("search");
    expect(names).toContain("calculate");
  });

  it("PlayWorld start with debug true enables verbose logging path", async () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const world = new PlayWorld({ debug: true });
    await world.start();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });
});
