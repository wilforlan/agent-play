import { describe, expect, it, vi } from "vitest";
import { createJoinBubbleSound } from "./join-bubble-sound.js";

describe("join bubble sound", () => {
  it("plays the bubble sound when a new user joins and audio is not muted", async () => {
    const play = vi.fn(async () => undefined);
    const sound = createJoinBubbleSound({
      play,
      getMuted: () => false,
    });
    await sound.playForJoin({ playerId: "carol" });
    expect(play).toHaveBeenCalledOnce();
  });

  it("does not play when muted", async () => {
    const play = vi.fn(async () => undefined);
    const sound = createJoinBubbleSound({
      play,
      getMuted: () => true,
    });
    await sound.playForJoin({ playerId: "carol" });
    expect(play).not.toHaveBeenCalled();
  });

  it("ignores joins for the local viewer", async () => {
    const play = vi.fn(async () => undefined);
    const sound = createJoinBubbleSound({
      play,
      getMuted: () => false,
      getLocalPlayerId: () => "carol",
    });
    await sound.playForJoin({ playerId: "carol" });
    expect(play).not.toHaveBeenCalled();
  });
});
