import { describe, expect, it } from "vitest";
import { buildSnapshotWorldMap } from "../preview-serialize.js";
import {
  PLAYER_CHAIN_HEADER_STABLE_KEY,
  buildMerkleRootHex,
  buildPlayerChainFanoutNotify,
  buildPlayerChainFromSnapshot,
  diffPlayerChainLeaves,
  digestLeaf,
  digestPair,
  parsePlayerChainFanoutNotify,
  stableOccupantSortKey,
  stableStringify,
} from "./index.js";

const GEN = "test-player-chain-genesis";

describe("player-chain index", () => {
  it("stableStringify sorts object keys", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("buildMerkleRootHex empty uses digestLeaf empty", () => {
    expect(buildMerkleRootHex([])).toBe(digestLeaf(""));
  });

  it("buildMerkleRootHex two leaves", () => {
    const a = digestLeaf("a");
    const b = digestLeaf("b");
    expect(buildMerkleRootHex([a, b])).toBe(digestPair(a, b));
  });

  it("stableOccupantSortKey", () => {
    expect(
      stableOccupantSortKey({
        kind: "human",
        id: "__human__",
        name: "You",
        x: 0,
        y: 0,
      })
    ).toBe("human:__human__");
    expect(
      stableOccupantSortKey({
        kind: "agent",
        agentId: "x",
        name: "n",
        x: 0,
        y: 0,
      })
    ).toBe("agent:x");
  });

  it("same occupants different order same merkle root", () => {
    const sid = "s1";
    const occA = {
      kind: "agent" as const,
      agentId: "a",
      name: "A",
      x: 0,
      y: 0,
    };
    const occB = {
      kind: "agent" as const,
      agentId: "b",
      name: "B",
      x: 1,
      y: 0,
    };
    const r1 = buildPlayerChainFromSnapshot(
      {
        sid,
        worldMap: buildSnapshotWorldMap([occA, occB]),
      },
      GEN
    );
    const r2 = buildPlayerChainFromSnapshot(
      {
        sid,
        worldMap: buildSnapshotWorldMap([occB, occA]),
      },
      GEN
    );
    expect(r1.merkleRootHex).toBe(r2.merkleRootHex);
  });

  it("different genesis produces different merkle root", () => {
    const snap = {
      sid: "s",
      worldMap: buildSnapshotWorldMap([]),
    };
    const a = buildPlayerChainFromSnapshot(snap, "genesis-a");
    const b = buildPlayerChainFromSnapshot(snap, "genesis-b");
    expect(a.merkleRootHex).not.toBe(b.merkleRootHex);
  });

  it("diffPlayerChainLeaves detects single occupant add", () => {
    const sid = "s";
    const prev = {
      sid,
      worldMap: buildSnapshotWorldMap([]),
    };
    const occ = {
      kind: "agent" as const,
      agentId: "a",
      name: "A",
      x: 0,
      y: 0,
    };
    const next = {
      sid,
      worldMap: buildSnapshotWorldMap([occ]),
    };
    const diff = diffPlayerChainLeaves(prev, next, GEN);
    expect(diff.removedKeys).toEqual([]);
    expect(diff.updates).toHaveLength(2);
    const keys = diff.updates.map((u) => u.stableKey).sort();
    expect(keys).toEqual([PLAYER_CHAIN_HEADER_STABLE_KEY, "agent:a"]);
  });

  it("diffPlayerChainLeaves reports header when session id changes genesis unchanged", () => {
    const occ = {
      kind: "agent" as const,
      agentId: "a",
      name: "A",
      x: 0,
      y: 0,
    };
    const prev = {
      sid: "s1",
      worldMap: buildSnapshotWorldMap([occ]),
    };
    const next = {
      sid: "s2",
      worldMap: buildSnapshotWorldMap([occ]),
    };
    const diff = diffPlayerChainLeaves(prev, next, GEN);
    const keys = diff.updates.map((u) => u.stableKey).sort();
    expect(keys).toEqual([PLAYER_CHAIN_HEADER_STABLE_KEY]);
  });

  it("buildPlayerChainFanoutNotify orders removed then updates with indices", () => {
    const occA = {
      kind: "agent" as const,
      agentId: "a",
      name: "A",
      x: 0,
      y: 0,
    };
    const occB = {
      kind: "agent" as const,
      agentId: "b",
      name: "B",
      x: 1,
      y: 0,
    };
    const prev = {
      sid: "s",
      worldMap: buildSnapshotWorldMap([occA, occB]),
    };
    const next = {
      sid: "s",
      worldMap: buildSnapshotWorldMap([occB]),
    };
    const n = buildPlayerChainFanoutNotify({
      prev,
      next,
      playerChainGenesisUtf8: GEN,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(n).toBeDefined();
    if (n === undefined) return;
    expect(n.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(n.nodes[0]?.stableKey).toBe("agent:a");
    expect(n.nodes[0]?.removed).toBe(true);
    expect(n.nodes[0]?.leafIndex).toBeGreaterThan(0);
  });

  it("parsePlayerChainFanoutNotify round-trip", () => {
    const raw = {
      updatedAt: "t",
      nodes: [
        { stableKey: "agent:x", leafIndex: 2, removed: true },
        { stableKey: "__header__", leafIndex: 1 },
      ],
    };
    expect(parsePlayerChainFanoutNotify(raw)).toEqual(raw);
  });
});
