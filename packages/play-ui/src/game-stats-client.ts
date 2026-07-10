/**
 * @packageDocumentation
 * @module @agent-play/play-ui/game-stats-client
 *
 * Browser client for the `getGameStats` RPC.
 *
 * @see ../../web-ui/src/app/api/agent-play/sdk/rpc/route.ts
 */

import type { GameStats } from "@agent-play/sdk/browser";

/**
 * Successful response shape.
 *
 * @public
 */
export type FetchGameStatsResult = {
  readonly stats: GameStats;
};

const parseGameStats = (raw: unknown): GameStats => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:game-stats] unexpected stats shape");
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
    throw new Error("[agent-play:game-stats] unexpected stats shape");
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
 * Fetch the player's arcade stats for today.
 *
 * @public
 */
export const fetchGameStats = async (input: {
  sid: string;
  playerId: string;
  fetcher?: typeof fetch;
}): Promise<FetchGameStatsResult> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getGameStats",
      payload: { playerId: input.playerId },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `[agent-play:game-stats] fetch failed with HTTP ${String(response.status)}`
    );
  }
  const json = (await response.json()) as { stats?: unknown };
  if (json.stats === undefined) {
    throw new Error("[agent-play:game-stats] unexpected response shape");
  }
  return { stats: parseGameStats(json.stats) };
};
