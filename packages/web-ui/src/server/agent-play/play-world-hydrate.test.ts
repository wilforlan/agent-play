import { describe, expect, it } from "vitest";
import { MemorySessionStore } from "./memory-session-store.js";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld snapshot via shared session store", () => {
  it("round-trips agents toolNames and session id through the store", async () => {
    const store = new MemorySessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const sid = w.getSessionId();
    await w.addPlayer({
      name: "Alpha",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["alpha_tool", "chat_tool"] },
      agentId: "hydrate-alpha",
    });
    const snap = await store.getSnapshotJson();
    expect(snap).not.toBeNull();
    if (snap === null) return;
    expect(snap.sid).toBe(sid);
    const occ = snap.worldMap.occupants.find((o) => o.kind === "agent");
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.toolNames).toEqual(["alpha_tool", "chat_tool"]);
    }

    const w2 = new PlayWorld({ sessionStore: store });
    await w2.start();
    expect(w2.getSessionId()).toBe(sid);
    expect(await w2.getSnapshotJson()).toEqual(snap);
  });
});
