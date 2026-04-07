import { describe, expect, it } from "vitest";
import { MemorySessionStore } from "./memory-session-store.js";
import {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
} from "./player-chain/index.js";
import { buildSnapshotWorldMap } from "./preview-serialize.js";
import { readPlayerChainNode } from "./read-player-chain-node.js";

describe("readPlayerChainNode", () => {
  it("returns genesis and header slices and occupant rows from resolved snapshot", async () => {
    const store = new MemorySessionStore();
    const sid = await store.loadOrCreateSessionId();
    const occ = {
      kind: "agent" as const,
      agentId: "p1",
      name: "P",
      x: 0,
      y: 0,
    };
    await store.persistSnapshot({
      sid,
      worldMap: buildSnapshotWorldMap([occ]),
    });
    const g = await readPlayerChainNode({
      sid,
      store,
      stableKey: PLAYER_CHAIN_GENESIS_STABLE_KEY,
    });
    expect(g?.kind).toBe("genesis");
    if (g?.kind !== "genesis") return;
    expect(g.text).toBe(store.playerChainGenesis.trim());

    const h = await readPlayerChainNode({
      sid,
      store,
      stableKey: PLAYER_CHAIN_HEADER_STABLE_KEY,
    });
    expect(h?.kind).toBe("header");
    if (h?.kind !== "header") return;
    expect(h.sid).toBe(sid);

    const o = await readPlayerChainNode({
      sid,
      store,
      stableKey: "agent:p1",
    });
    expect(o?.kind).toBe("occupant");
    if (o?.kind !== "occupant" || o.removed) return;
    expect(o.occupant.agentId).toBe("p1");

    const human = await readPlayerChainNode({
      sid,
      store,
      stableKey: "human:__human__",
    });
    expect(human?.kind).toBe("occupant");
    if (human?.kind !== "occupant" || human.removed) return;
    expect(human.occupant.kind).toBe("human");

    const missing = await readPlayerChainNode({
      sid,
      store,
      stableKey: "agent:nope",
    });
    expect(missing?.kind).toBe("occupant");
    if (missing?.kind !== "occupant") return;
    expect(missing.removed).toBe(true);
  });
});
