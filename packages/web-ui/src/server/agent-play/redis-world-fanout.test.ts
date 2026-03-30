import { describe, expect, it } from "vitest";
import {
  parseWorldFanoutMessage,
  worldFanoutChannel,
} from "./redis-world-fanout.js";

describe("redis-world-fanout", () => {
  it("worldFanoutChannel uses host id", () => {
    expect(worldFanoutChannel("my-host")).toBe(
      "agent-play:my-host:world:events"
    );
  });

  it("parseWorldFanoutMessage accepts rev event data", () => {
    expect(
      parseWorldFanoutMessage(
        JSON.stringify({
          rev: 3,
          event: "world:interaction",
          data: { playerId: "p1", text: "hi" },
        })
      )
    ).toEqual({
      rev: 3,
      event: "world:interaction",
      data: { playerId: "p1", text: "hi" },
    });
  });

  it("parseWorldFanoutMessage returns null for invalid json", () => {
    expect(parseWorldFanoutMessage("not json")).toBeNull();
    expect(parseWorldFanoutMessage("{}")).toBeNull();
  });
});
