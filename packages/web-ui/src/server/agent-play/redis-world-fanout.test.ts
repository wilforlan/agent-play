import { describe, expect, it } from "vitest";
import {
  parseWorldFanoutMessage,
} from "./redis-world-fanout.js";

describe("redis-world-fanout", () => {
  it("parseWorldFanoutMessage accepts rev event data", () => {
    expect(
      parseWorldFanoutMessage(
        JSON.stringify({ rev: 1, event: "world:test", data: { ok: true } })
      )
    ).toEqual({ rev: 1, event: "world:test", data: { ok: true } });
  });

  it("parseWorldFanoutMessage preserves playerChainNotify when present", () => {
    const raw = JSON.stringify({
      rev: 2,
      event: "world:player_added",
      data: {},
      merkleRootHex: "deadbeef",
      merkleLeafCount: 4,
      playerChainNotify: {
        updatedAt: "2026-04-04T12:00:00.000Z",
        nodes: [
          {
            stableKey: "agent:a",
            leafIndex: 3,
            updatedAt: "2026-04-04T12:00:00.000Z",
          },
        ],
      },
    });
    expect(parseWorldFanoutMessage(raw)).toEqual({
      rev: 2,
      event: "world:player_added",
      data: {},
      merkleRootHex: "deadbeef",
      merkleLeafCount: 4,
      playerChainNotify: {
        updatedAt: "2026-04-04T12:00:00.000Z",
        nodes: [
          {
            stableKey: "agent:a",
            leafIndex: 3,
            updatedAt: "2026-04-04T12:00:00.000Z",
          },
        ],
      },
    });
  });

  it("parseWorldFanoutMessage preserves merkleRootHex when present", () => {
    expect(
      parseWorldFanoutMessage(
        JSON.stringify({
          rev: 1,
          event: "e",
          data: null,
          merkleRootHex: "abc",
          merkleLeafCount: 2,
        })
      )
    ).toEqual({
      rev: 1,
      event: "e",
      data: null,
      merkleRootHex: "abc",
      merkleLeafCount: 2,
    });
  });

  it("parseWorldFanoutMessage returns null for invalid json", () => {
    expect(parseWorldFanoutMessage("not json")).toBeNull();
    expect(parseWorldFanoutMessage("{}")).toBeNull();
  });
});
