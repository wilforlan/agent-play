import { describe, expect, it } from "vitest";
import {
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotify,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
} from "./player-chain-merge.js";
import {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
} from "./world-chain-keys.js";
import type {
  AgentPlaySnapshot,
  PlayerChainNodeResponse,
  PlayerChainNotifyNodeRef,
} from "../public-types.js";

function minimalSnapshot(sid: string, occupants: AgentPlaySnapshot["worldMap"]["occupants"] = []): AgentPlaySnapshot {
  return {
    sid,
    worldMap: {
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      occupants,
    },
  };
}

const sampleAgent = (agentId: string, x = 0, y = 0) =>
  ({
    kind: "agent" as const,
    nodeId: "__legacy__",
    agentId,
    name: "N",
    x,
    y,
  }) satisfies AgentPlaySnapshot["worldMap"]["occupants"][number];

const sampleHuman = (id: string, x = 0, y = 0) =>
  ({
    kind: "human" as const,
    id,
    name: "You",
    x,
    y,
  }) satisfies AgentPlaySnapshot["worldMap"]["occupants"][number];

describe("mergeSnapshotWithPlayerChainNode", () => {
  it("leaves snapshot unchanged for genesis node", () => {
    const before = minimalSnapshot("x");
    const after = mergeSnapshotWithPlayerChainNode(before, {
      kind: "genesis",
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
      text: "g",
    });
    expect(after).toEqual(before);
  });

  it("applies header sid and bounds", () => {
    const next = mergeSnapshotWithPlayerChainNode(minimalSnapshot("a"), {
      kind: "header",
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
      sid: "b",
      bounds: { minX: -1, minY: -1, maxX: 2, maxY: 2 },
    });
    expect(next.sid).toBe("b");
    expect(next.worldMap.bounds.maxX).toBe(2);
  });

  it("appends a new occupant from a present node", () => {
    const row = sampleAgent("p", 3, 4);
    const next = mergeSnapshotWithPlayerChainNode(minimalSnapshot("s"), {
      kind: "occupant",
      stableKey: "agent:__legacy__:p",
      removed: false,
      occupant: row,
    });
    expect(next.worldMap.occupants).toHaveLength(1);
    expect(next.worldMap.occupants[0]).toEqual(row);
  });

  it("replaces an occupant when the stable key matches (upsert)", () => {
    const v1 = sampleAgent("p", 0, 0);
    const v2 = { ...v1, x: 9, y: 9 };
    const next = mergeSnapshotWithPlayerChainNode(minimalSnapshot("s", [v1]), {
      kind: "occupant",
      stableKey: "agent:__legacy__:p",
      removed: false,
      occupant: v2,
    });
    expect(next.worldMap.occupants).toHaveLength(1);
    expect(next.worldMap.occupants[0]?.x).toBe(9);
  });

  it("removes an occupant when the node is removed", () => {
    const row = sampleAgent("p");
    const next = mergeSnapshotWithPlayerChainNode(minimalSnapshot("s", [row]), {
      kind: "occupant",
      stableKey: "agent:__legacy__:p",
      removed: true,
    });
    expect(next.worldMap.occupants).toHaveLength(0);
  });

  it("throws when occupant node has neither removed true nor false (defensive)", () => {
    const malformed = {
      kind: "occupant",
      stableKey: "agent:__legacy__:p",
      removed: undefined,
    } as unknown as PlayerChainNodeResponse;
    expect(() =>
      mergeSnapshotWithPlayerChainNode(minimalSnapshot("s"), malformed)
    ).toThrow(/invalid occupant node/);
  });
});

describe("sortNodeRefsForSerializedFetch", () => {
  it("orders removals by descending leafIndex then the rest by ascending leafIndex", () => {
    const sorted = sortNodeRefsForSerializedFetch([
      { stableKey: "a", leafIndex: 2 },
      { stableKey: "b", leafIndex: 1, removed: true },
      { stableKey: "c", leafIndex: 0 },
    ]);
    expect(sorted.map((r: PlayerChainNotifyNodeRef) => r.stableKey)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});

describe("parsePlayerChainFanoutNotify", () => {
  it("returns undefined for non-record input", () => {
    expect(parsePlayerChainFanoutNotify(null)).toBeUndefined();
    expect(parsePlayerChainFanoutNotify("x")).toBeUndefined();
  });

  it("returns undefined when updatedAt is missing or empty", () => {
    expect(parsePlayerChainFanoutNotify({})).toBeUndefined();
    expect(parsePlayerChainFanoutNotify({ updatedAt: "", nodes: [] })).toBeUndefined();
  });

  it("returns undefined when nodes is not an array", () => {
    expect(parsePlayerChainFanoutNotify({ updatedAt: "t", nodes: null })).toBeUndefined();
  });

  it("returns undefined when a node row is invalid", () => {
    expect(
      parsePlayerChainFanoutNotify({
        updatedAt: "t",
        nodes: [{ stableKey: "", leafIndex: 0 }],
      })
    ).toBeUndefined();
  });

  it("parses valid notify including optional removed and updatedAt on nodes", () => {
    const n = parsePlayerChainFanoutNotify({
      updatedAt: "t",
      nodes: [
        { stableKey: "k", leafIndex: 0, removed: true, updatedAt: "u" },
      ],
    });
    expect(n).toEqual({
      updatedAt: "t",
      nodes: [
        { stableKey: "k", leafIndex: 0, removed: true, updatedAt: "u" },
      ],
    });
  });
});

describe("parsePlayerChainFanoutNotifyFromSsePayload", () => {
  it("reads playerChainNotify from SSE-shaped payload", () => {
    const n = parsePlayerChainFanoutNotifyFromSsePayload({
      playerChainNotify: {
        updatedAt: "t",
        nodes: [{ stableKey: "k", leafIndex: 0 }],
      },
      role: "tool",
    });
    expect(n?.nodes[0]?.stableKey).toBe("k");
  });
});

describe("parsePlayerChainNodeRpcBody", () => {
  it("parses header node", () => {
    const node = parsePlayerChainNodeRpcBody({
      node: {
        kind: "header",
        stableKey: "__header__",
        sid: "z",
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
    });
    expect(node.kind).toBe("header");
  });

  it("parses removed occupant node", () => {
    const node = parsePlayerChainNodeRpcBody({
      node: {
        kind: "occupant",
        stableKey: "agent:x",
        removed: true,
      },
    });
    expect(node).toEqual({
      kind: "occupant",
      stableKey: "agent:x",
      removed: true,
    });
  });

  it("parses and merges human occupant node", () => {
    const node = parsePlayerChainNodeRpcBody({
      node: {
        kind: "occupant",
        stableKey: "human:__human__",
        removed: false,
        occupant: sampleHuman("__human__"),
      },
    });
    const next = mergeSnapshotWithPlayerChainNode(minimalSnapshot("s"), node);
    expect(next.worldMap.occupants.some((o) => o.kind === "human")).toBe(true);
  });

  it("throws when genesis stableKey is wrong", () => {
    expect(() =>
      parsePlayerChainNodeRpcBody({
        node: { kind: "genesis", stableKey: "wrong", text: "x" },
      })
    ).toThrow(/invalid genesis node/);
  });
});
