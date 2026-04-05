import { describe, expect, it } from "vitest";
import {
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
} from "./player-chain-merge.js";
import { PLAYER_CHAIN_GENESIS_STABLE_KEY, PLAYER_CHAIN_HEADER_STABLE_KEY } from "./world-chain-keys.js";
import type { AgentPlaySnapshot } from "../public-types.js";

const emptySnapshot = (sid: string): AgentPlaySnapshot => ({
  sid,
  worldMap: {
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    occupants: [],
  },
});

describe("player-chain-merge", () => {
  it("mergeSnapshotWithPlayerChainNode updates header bounds and sid", () => {
    const s0 = emptySnapshot("a");
    const s1 = mergeSnapshotWithPlayerChainNode(s0, {
      kind: "header",
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
      sid: "b",
      bounds: { minX: -1, minY: -1, maxX: 2, maxY: 2 },
    });
    expect(s1.sid).toBe("b");
    expect(s1.worldMap.bounds.maxX).toBe(2);
  });

  it("mergeSnapshotWithPlayerChainNode ignores genesis for snapshot shape", () => {
    const s0 = emptySnapshot("x");
    const s1 = mergeSnapshotWithPlayerChainNode(s0, {
      kind: "genesis",
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
      text: "g",
    });
    expect(s1).toEqual(s0);
  });

  it("mergeSnapshotWithPlayerChainNode upserts occupant", () => {
    const row = {
      kind: "agent" as const,
      agentId: "p",
      name: "N",
      x: 3,
      y: 4,
    };
    const s1 = mergeSnapshotWithPlayerChainNode(emptySnapshot("s"), {
      kind: "occupant",
      stableKey: "agent:p",
      removed: false,
      occupant: row,
    });
    expect(s1.worldMap.occupants).toHaveLength(1);
    expect(s1.worldMap.occupants[0]).toEqual(row);
  });

  it("mergeSnapshotWithPlayerChainNode removes occupant", () => {
    const row = {
      kind: "agent" as const,
      agentId: "p",
      name: "N",
      x: 0,
      y: 0,
    };
    const s0: AgentPlaySnapshot = {
      sid: "s",
      worldMap: {
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        occupants: [row],
      },
    };
    const s1 = mergeSnapshotWithPlayerChainNode(s0, {
      kind: "occupant",
      stableKey: "agent:p",
      removed: true,
    });
    expect(s1.worldMap.occupants).toHaveLength(0);
  });

  it("sortNodeRefsForSerializedFetch orders like server notify", () => {
    const sorted = sortNodeRefsForSerializedFetch([
      { stableKey: "a", leafIndex: 2 },
      { stableKey: "b", leafIndex: 1, removed: true },
      { stableKey: "c", leafIndex: 0 },
    ]);
    expect(sorted.map((r) => r.stableKey)).toEqual(["b", "c", "a"]);
  });

  it("parsePlayerChainFanoutNotifyFromSsePayload reads nested notify", () => {
    const n = parsePlayerChainFanoutNotifyFromSsePayload({
      playerChainNotify: {
        updatedAt: "t",
        nodes: [{ stableKey: "k", leafIndex: 0 }],
      },
      role: "tool",
    });
    expect(n?.nodes[0]?.stableKey).toBe("k");
  });

  it("parsePlayerChainNodeRpcBody parses rpc envelope", () => {
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
});
