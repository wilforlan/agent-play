import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld hydrateFromSnapshot", () => {
  it("round-trips players toolNames and session id", async () => {
    const w = new PlayWorld({});
    await w.start();
    const sid = w.getSessionId();
    await w.addPlayer({
      name: "Alpha",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["alpha_tool", "chat_tool"] },
    });
    const snap = w.getSnapshotJson();
    expect(snap.sid).toBe(sid);
    expect(snap.players[0]?.toolNames).toEqual(["alpha_tool", "chat_tool"]);

    const w2 = new PlayWorld({});
    await w2.start();
    const before = w2.getSessionId();
    expect(before).not.toBe(sid);
    w2.hydrateFromSnapshot(snap);
    expect(w2.getSessionId()).toBe(sid);
    expect(w2.getSnapshotJson()).toEqual(snap);
  });
});
