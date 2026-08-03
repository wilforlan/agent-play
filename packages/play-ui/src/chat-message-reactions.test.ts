import { describe, expect, it } from "vitest";
import {
  MESSAGE_REACTION_KINDS,
  applyMessageReaction,
  countMessageReactions,
  createEmptyMessageReactions,
  hasPlayerReaction,
} from "./chat-message-reactions.js";

describe("message reactions", () => {
  it("supports love and thumbs_up kinds", () => {
    expect(MESSAGE_REACTION_KINDS).toEqual(["love", "thumbs_up"]);
  });

  it("adds a reaction for a player", () => {
    const next = applyMessageReaction({
      reactions: createEmptyMessageReactions(),
      kind: "love",
      playerId: "main-1",
      action: "set",
    });
    expect(next.love).toEqual(["main-1"]);
    expect(hasPlayerReaction(next, "love", "main-1")).toBe(true);
    expect(countMessageReactions(next)).toBe(1);
  });

  it("cancels a player's own reaction", () => {
    const withLove = applyMessageReaction({
      reactions: createEmptyMessageReactions(),
      kind: "love",
      playerId: "main-1",
      action: "set",
    });
    const cancelled = applyMessageReaction({
      reactions: withLove,
      kind: "love",
      playerId: "main-1",
      action: "cancel",
    });
    expect(cancelled.love).toEqual([]);
    expect(hasPlayerReaction(cancelled, "love", "main-1")).toBe(false);
  });

  it("keeps one reaction kind per player by replacing the previous kind", () => {
    const loved = applyMessageReaction({
      reactions: createEmptyMessageReactions(),
      kind: "love",
      playerId: "main-1",
      action: "set",
    });
    const thumbs = applyMessageReaction({
      reactions: loved,
      kind: "thumbs_up",
      playerId: "main-1",
      action: "set",
    });
    expect(thumbs.love).toEqual([]);
    expect(thumbs.thumbs_up).toEqual(["main-1"]);
  });

  it("is idempotent when setting the same reaction twice", () => {
    const first = applyMessageReaction({
      reactions: createEmptyMessageReactions(),
      kind: "thumbs_up",
      playerId: "main-2",
      action: "set",
    });
    const second = applyMessageReaction({
      reactions: first,
      kind: "thumbs_up",
      playerId: "main-2",
      action: "set",
    });
    expect(second.thumbs_up).toEqual(["main-2"]);
  });
});
