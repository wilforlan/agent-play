import { describe, expect, it } from "vitest";
import {
  appendChatLogLine,
  getChatLogLinesForAgent,
  resetChatLogFromSnapshot,
} from "./preview-chat-log.js";

const emptyWorld = { worldMap: { occupants: [] as const } };

describe("preview chat log", () => {
  it("rebuilds from snapshot recentInteractions", () => {
    resetChatLogFromSnapshot({
      worldMap: {
        occupants: [
          {
            kind: "agent",
            agentId: "a",
            name: "A",
            recentInteractions: [{ role: "user", text: "hello", seq: 2 }],
          },
          {
            kind: "agent",
            agentId: "b",
            name: "B",
            recentInteractions: [{ role: "assistant", text: "hi", seq: 1 }],
          },
        ],
      },
    });
    expect(getChatLogLinesForAgent("a").map((l) => l.text)).toEqual(["hello"]);
    expect(getChatLogLinesForAgent("b").map((l) => l.text)).toEqual(["hi"]);
  });

  it("dedupes append by agentId seq and role", () => {
    resetChatLogFromSnapshot(emptyWorld);
    appendChatLogLine({
      agentId: "p",
      playerName: "P",
      role: "user",
      text: "one",
      seq: 1,
    });
    appendChatLogLine({
      agentId: "p",
      playerName: "P",
      role: "user",
      text: "one",
      seq: 1,
    });
    expect(getChatLogLinesForAgent("p").length).toBe(1);
  });

  it("merges multi-agent histories sorted by seq", () => {
    resetChatLogFromSnapshot({
      worldMap: {
        occupants: [
          {
            kind: "agent",
            agentId: "a",
            name: "A",
            recentInteractions: [{ role: "user", text: "from a", seq: 3 }],
          },
          {
            kind: "agent",
            agentId: "b",
            name: "B",
            recentInteractions: [
              { role: "user", text: "b first", seq: 1 },
              { role: "assistant", text: "b second", seq: 2 },
            ],
          },
        ],
      },
    });
    expect(getChatLogLinesForAgent("a").map((l) => l.text)).toEqual(["from a"]);
    expect(getChatLogLinesForAgent("b").map((l) => l.text)).toEqual([
      "b first",
      "b second",
    ]);
  });

  it("append assigns incrementing seq when omitted", () => {
    resetChatLogFromSnapshot(emptyWorld);
    appendChatLogLine({
      agentId: "x",
      playerName: "X",
      role: "user",
      text: "x1",
    });
    appendChatLogLine({
      agentId: "y",
      playerName: "Y",
      role: "user",
      text: "y1",
    });
    appendChatLogLine({
      agentId: "x",
      playerName: "X",
      role: "user",
      text: "x2",
    });
    expect(getChatLogLinesForAgent("x").map((l) => l.text)).toEqual(["x1", "x2"]);
    expect(getChatLogLinesForAgent("y").map((l) => l.text)).toEqual(["y1"]);
  });
});
