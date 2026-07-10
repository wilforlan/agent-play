import { describe, expect, it } from "vitest";
import { TestSessionStore } from "../../server/agent-play/session-store.test-double.js";

describe("session store game outcomes", () => {
  it("applies game outcome and updates wallet power-ups", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const playerId = "player-1";
    await store.getPlayerWallet(playerId);
    const result = await store.applyGameOutcome({
      playerId,
      now: new Date("2026-06-10T12:00:00Z").toISOString(),
      outcome: {
        gameId: "hidden-gems",
        roundId: "round-1",
        events: [{ type: "chest_open", correct: true, tutorial: true }],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.netPu).toBeGreaterThan(0);
    expect(result.wallet.powerUps).toBeGreaterThan(0);
    const stats = await store.getGameStats({
      playerId,
      now: new Date("2026-06-10T12:00:00Z").toISOString(),
    });
    expect(stats.gamesPlayedToday).toBe(1);
  });

  it("appends an APU credit transaction when a game round earns power-ups", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const playerId = "player-apu";
    await store.getPlayerWallet(playerId);
    const result = await store.applyGameOutcome({
      playerId,
      now: new Date("2026-06-10T12:00:00Z").toISOString(),
      outcome: {
        gameId: "hidden-gems",
        roundId: "round-apu",
        events: [{ type: "chest_open", correct: true, tutorial: true }],
      },
    });
    expect(result.ok).toBe(true);
    const purchases = await store.listPurchases({ playerId, limit: 10 });
    const apuRow = purchases.find((row) => row.amenityKind === "apu_credit");
    expect(apuRow).toBeDefined();
    expect(apuRow?.token).toBe("APU");
    expect(apuRow?.creditSource).toBe("game:hidden-gems");
    expect(apuRow?.playerId).toBe(playerId);
    expect((apuRow?.powerUpsEarned ?? 0) > 0).toBe(true);
  });

  it("rejects duplicate round ids", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const playerId = "player-2";
    const now = new Date("2026-06-10T12:00:00Z").toISOString();
    const outcome = {
      gameId: "hidden-gems" as const,
      roundId: "round-dup",
      events: [{ type: "chest_open" as const, correct: true }],
    };
    await store.applyGameOutcome({ playerId, now, outcome });
    const second = await store.applyGameOutcome({ playerId, now, outcome });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBe("DUPLICATE_ROUND");
  });
});
