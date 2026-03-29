import { describe, expect, it } from "vitest";
import {
  appendChatLogLine,
  clearChatLog,
  getChatLogLines,
  getChatLogLinesForPlayer,
  resetChatLogFromSnapshot,
} from "./preview-chat-log.js";

describe("preview-chat-log", () => {
  it("appends and sorts snapshot lines by seq", () => {
    clearChatLog();
    resetChatLogFromSnapshot({
      players: [
        {
          playerId: "a",
          name: "A",
          recentInteractions: [
            { role: "user", text: "second", seq: 2 },
            { role: "assistant", text: "first", seq: 1 },
          ],
        },
      ],
    });
    const lis = [...getChatLogLines()];
    expect(lis.map((r) => r.text)).toEqual(["first", "second"]);
  });

  it("dedupes append by playerId seq and role", () => {
    clearChatLog();
    appendChatLogLine({
      playerId: "p",
      playerName: "P",
      role: "user",
      text: "hi",
      seq: 5,
    });
    appendChatLogLine({
      playerId: "p",
      playerName: "P",
      role: "user",
      text: "hi",
      seq: 5,
    });
    expect(getChatLogLines().length).toBe(1);
  });

  it("returns only lines for the requested player after snapshot", () => {
    clearChatLog();
    resetChatLogFromSnapshot({
      players: [
        {
          playerId: "a",
          name: "A",
          recentInteractions: [{ role: "user", text: "from a", seq: 1 }],
        },
        {
          playerId: "b",
          name: "B",
          recentInteractions: [
            { role: "assistant", text: "from b", seq: 2 },
            { role: "user", text: "from b2", seq: 3 },
          ],
        },
      ],
    });
    expect(getChatLogLinesForPlayer("a").map((l) => l.text)).toEqual(["from a"]);
    expect(getChatLogLinesForPlayer("b").map((l) => l.text)).toEqual([
      "from b",
      "from b2",
    ]);
  });

  it("returns only lines for the requested player after append", () => {
    clearChatLog();
    appendChatLogLine({
      playerId: "x",
      playerName: "X",
      role: "user",
      text: "x1",
    });
    appendChatLogLine({
      playerId: "y",
      playerName: "Y",
      role: "user",
      text: "y1",
    });
    appendChatLogLine({
      playerId: "x",
      playerName: "X",
      role: "assistant",
      text: "x2",
    });
    expect(getChatLogLinesForPlayer("x").map((l) => l.text)).toEqual(["x1", "x2"]);
    expect(getChatLogLinesForPlayer("y").map((l) => l.text)).toEqual(["y1"]);
  });
});
