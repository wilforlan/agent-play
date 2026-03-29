import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld resetSession", () => {
  it("clears players and rotates the session id", async () => {
    const w = new PlayWorld();
    await w.start();
    const before = w.getSessionId();
    await w.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    expect(w.getSnapshotJson().players.length).toBeGreaterThan(0);
    const after = await w.resetSession();
    expect(after).not.toBe(before);
    expect(w.isSessionSid(after)).toBe(true);
    expect(w.getSnapshotJson().players.length).toBe(0);
  });
});
