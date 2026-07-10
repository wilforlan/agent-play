/**
 * @packageDocumentation
 * @module @agent-play/play-ui/apply-game-outcome-client
 *
 * Browser client for the `applyGameOutcome` RPC.
 *
 * @see ../../web-ui/src/app/api/agent-play/sdk/rpc/route.ts
 */

import type { GameEvent, GameId, GameStats } from "@agent-play/sdk/browser";
import type { WalletDto } from "./wallet-client.js";

/**
 * Successful response shape.
 *
 * @public
 */
export type ApplyGameOutcomeResult = {
  readonly stats: GameStats;
  readonly wallet: WalletDto;
  readonly netPu: number;
};

const parseWallet = (raw: unknown): WalletDto => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:game-outcome] unexpected wallet shape");
  }
  const w = raw as {
    playerId?: unknown;
    balanceUsd?: unknown;
    powerUps?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof w.playerId !== "string" ||
    w.playerId.trim().length === 0 ||
    typeof w.balanceUsd !== "number" ||
    typeof w.updatedAt !== "string"
  ) {
    throw new Error("[agent-play:game-outcome] unexpected wallet shape");
  }
  const powerUps =
    typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
      ? Math.max(0, Math.floor(w.powerUps))
      : 0;
  return {
    playerId: w.playerId,
    balanceUsd: w.balanceUsd,
    powerUps,
    currency: "USD",
    updatedAt: w.updatedAt,
  };
};

const parseGameStats = (raw: unknown): GameStats => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:game-outcome] unexpected stats shape");
  }
  const s = raw as {
    dayStreak?: unknown;
    bestStreak?: unknown;
    puEarnedToday?: unknown;
    puCapRemaining?: unknown;
    gamesPlayedToday?: unknown;
    featuredGameId?: unknown;
    firstGamePlayed?: unknown;
    perGame?: unknown;
  };
  if (
    typeof s.dayStreak !== "number" ||
    typeof s.bestStreak !== "number" ||
    typeof s.puEarnedToday !== "number" ||
    typeof s.puCapRemaining !== "number" ||
    typeof s.gamesPlayedToday !== "number" ||
    typeof s.featuredGameId !== "string" ||
    typeof s.firstGamePlayed !== "boolean" ||
    typeof s.perGame !== "object" ||
    s.perGame === null
  ) {
    throw new Error("[agent-play:game-outcome] unexpected stats shape");
  }
  return {
    dayStreak: Math.max(0, Math.floor(s.dayStreak)),
    bestStreak: Math.max(0, Math.floor(s.bestStreak)),
    puEarnedToday: Math.max(0, Math.floor(s.puEarnedToday)),
    puCapRemaining: Math.max(0, Math.floor(s.puCapRemaining)),
    gamesPlayedToday: Math.max(0, Math.floor(s.gamesPlayedToday)),
    featuredGameId: s.featuredGameId,
    firstGamePlayed: s.firstGamePlayed,
    perGame: s.perGame as GameStats["perGame"],
  };
};

/**
 * Submit a completed arcade round to the server.
 *
 * @public
 */
export const applyGameOutcome = async (input: {
  sid: string;
  playerId: string;
  gameId: GameId;
  roundId: string;
  events: ReadonlyArray<GameEvent>;
  fetcher?: typeof fetch;
}): Promise<ApplyGameOutcomeResult> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "applyGameOutcome",
      payload: {
        playerId: input.playerId,
        gameId: input.gameId,
        roundId: input.roundId,
        events: input.events,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `[agent-play:game-outcome] fetch failed with HTTP ${String(response.status)}`
    );
  }
  const json = (await response.json()) as {
    stats?: unknown;
    wallet?: unknown;
    netPu?: unknown;
    error?: unknown;
  };
  if (
    json.stats === undefined ||
    json.wallet === undefined ||
    typeof json.netPu !== "number"
  ) {
    const err =
      typeof json.error === "string" ? json.error : "unexpected response shape";
    throw new Error(`[agent-play:game-outcome] ${err}`);
  }
  return {
    stats: parseGameStats(json.stats),
    wallet: parseWallet(json.wallet),
    netPu: json.netPu,
  };
};
