import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld snapshot via shared session store", () => {
  it("round-trips agents toolNames and session id through the store", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const sid = store.getSessionId();
    await w.addPlayer({
      name: "Alpha",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["alpha_tool", "chat_tool"] },
      agentId: "hydrate-alpha",
    });
    const snap = await store.getSnapshotJson();
    expect(snap).not.toBeNull();
    if (snap === null) return;
    expect(snap.sid).toBe(store.playerChainGenesis);
    expect(snap.sid).not.toBe(sid);
    const occ = snap.worldMap.occupants.find((o) => o.kind === "agent");
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.toolNames).toEqual(["alpha_tool", "chat_tool"]);
    }

    const w2 = new PlayWorld({ sessionStore: store });
    await w2.start();
    expect(store.getSessionId()).toBe(sid);
    const restartedSnapshot = await w2.getSnapshotJson();
    expect(restartedSnapshot.sid).toBe(store.playerChainGenesis);
    expect(
      restartedSnapshot.worldMap.occupants.filter((o) => o.kind === "agent")
        .length
    ).toBe(1);
  });

  it("stores enableP2a on agent occupant snapshot when addPlayer enables P2A", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.addPlayer({
      name: "P2A Bot",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "p2a-occ-agent",
      enableP2a: "on",
    });
    const snap = await store.getSnapshotJson();
    expect(snap).not.toBeNull();
    if (snap === null) return;
    const occ = snap.worldMap.occupants.find(
      (o) => o.kind === "agent" && o.agentId === "p2a-occ-agent"
    );
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.enableP2a).toBe("on");
    }
  });

  it("keeps existing world snapshot at startup when already initialized", async () => {
    const store = new TestSessionStore();
    const sid = await store.loadOrCreateSessionId();
    await store.persistSnapshot({
      sid: "stale-snapshot-id",
      worldMap: {
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        occupants: [
          { kind: "agent", agentId: "stale", name: "Stale", x: 0, y: 0 },
        ],
      },
    });
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const snapshot = await w.getSnapshotJson();
    expect(store.getSessionId()).toBe(sid);
    expect(snapshot.sid).toBe("stale-snapshot-id");
    expect(
      snapshot.worldMap.occupants.filter((o) => o.kind === "agent").length
    ).toBe(1);
    expect(snapshot.worldMap.occupants.length).toBe(1);
  });
});
