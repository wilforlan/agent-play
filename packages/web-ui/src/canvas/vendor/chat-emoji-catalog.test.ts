import { describe, expect, it } from "vitest";
import {
  CHAT_EMOJI_CATALOG,
  CHAT_EMOJI_LIMIT,
  isChatEmoji,
} from "./chat-emoji-catalog.js";

describe("chat emoji catalog", () => {
  it("exposes exactly 50 unique emojis", () => {
    expect(CHAT_EMOJI_CATALOG).toHaveLength(CHAT_EMOJI_LIMIT);
    expect(CHAT_EMOJI_LIMIT).toBe(50);
    expect(new Set(CHAT_EMOJI_CATALOG).size).toBe(50);
  });

  it("accepts catalog members and rejects unknown tokens", () => {
    expect(isChatEmoji(CHAT_EMOJI_CATALOG[0]!)).toBe(true);
    expect(isChatEmoji("not-an-emoji")).toBe(false);
    expect(isChatEmoji("")).toBe(false);
  });
});
