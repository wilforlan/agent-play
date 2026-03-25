import { describe, expect, it } from "vitest";
import {
  appendChatLogLine,
  clearChatLog,
  getChatLogLines,
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
});
