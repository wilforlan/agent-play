import {
  computeRoundPuDelta,
  createEmptyGameStats,
  DAILY_GAME_PU_CAP,
  featuredGameIdForUtcDate,
  GamePerTitleStatsSchema,
  GameStatsSchema,
  STREAK_BONUS_PU,
  STREAK_BONUS_THRESHOLD_DAYS,
  utcDateKey,
  type ApplyGameOutcomeInput,
  type GameStats,
} from "@agent-play/sdk";
import type { PlayerWallet } from "@agent-play/sdk";
import { PlayerWalletSchema } from "@agent-play/sdk";

export type GamePlayerState = {
  stats: GameStats;
  lastPlayDate: string | null;
  processedRoundIds: ReadonlySet<string>;
};

export type SerializedGamePlayerState = {
  stats: GameStats;
  lastPlayDate: string | null;
  processedRoundIds: readonly string[];
};

export const serializeGamePlayerState = (
  state: GamePlayerState
): SerializedGamePlayerState => ({
  stats: state.stats,
  lastPlayDate: state.lastPlayDate,
  processedRoundIds: [...state.processedRoundIds],
});

export const deserializeGamePlayerState = (
  raw: SerializedGamePlayerState
): GamePlayerState => ({
  stats: GameStatsSchema.parse(raw.stats),
  lastPlayDate: raw.lastPlayDate,
  processedRoundIds: new Set(raw.processedRoundIds),
});

export type ApplyGameOutcomeResult =
  | {
      ok: true;
      stats: GameStats;
      wallet: PlayerWallet;
      netPu: number;
    }
  | { ok: false; error: "DUPLICATE_ROUND" | "INVALID_EVENTS" | "CAP_EXCEEDED" };

export const createInitialGamePlayerState = (now: Date): GamePlayerState => ({
  stats: createEmptyGameStats(now),
  lastPlayDate: null,
  processedRoundIds: new Set(),
});

const clampPuEarn = (requested: number, earnedToday: number): number => {
  const remaining = Math.max(0, DAILY_GAME_PU_CAP - earnedToday);
  if (requested <= 0) return requested;
  return Math.min(requested, remaining);
};

export const applyGameOutcomeToState = (input: {
  state: GamePlayerState;
  wallet: PlayerWallet;
  outcome: ApplyGameOutcomeInput;
  now: Date;
}): { result: ApplyGameOutcomeResult; state: GamePlayerState; wallet: PlayerWallet } => {
  if (input.outcome.events.length === 0) {
    return {
      result: { ok: false, error: "INVALID_EVENTS" },
      state: input.state,
      wallet: input.wallet,
    };
  }
  if (input.state.processedRoundIds.has(input.outcome.roundId)) {
    return {
      result: { ok: false, error: "DUPLICATE_ROUND" },
      state: input.state,
      wallet: input.wallet,
    };
  }

  const dateKey = utcDateKey(input.now);
  let stats =
    input.state.lastPlayDate === dateKey
      ? input.state.stats
      : createEmptyGameStats(input.now);

  const rawDelta = computeRoundPuDelta(input.outcome.events);
  const isFirstEver = !input.state.stats.firstGamePlayed && !stats.firstGamePlayed;
  const adjustedDelta =
    isFirstEver && rawDelta < 5 ? Math.max(rawDelta, 5) : rawDelta;
  const clampedEarn = clampPuEarn(adjustedDelta, stats.puEarnedToday);
  if (adjustedDelta > 0 && clampedEarn <= 0) {
    return {
      result: { ok: false, error: "CAP_EXCEEDED" },
      state: input.state,
      wallet: input.wallet,
    };
  }

  const prevDate = input.state.lastPlayDate;
  let dayStreak = stats.dayStreak;
  if (prevDate === null) {
    dayStreak = 1;
  } else if (prevDate !== dateKey) {
    const yesterday = new Date(input.now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    dayStreak =
      utcDateKey(yesterday) === prevDate ? stats.dayStreak + 1 : 1;
  }

  let streakBonus = 0;
  if (
    dayStreak >= STREAK_BONUS_THRESHOLD_DAYS &&
    prevDate !== dateKey
  ) {
    streakBonus = STREAK_BONUS_PU;
  }

  const netPu = clampedEarn + streakBonus;
  const nextPu = Math.max(0, (input.wallet.powerUps ?? 0) + netPu);
  const nextWallet = PlayerWalletSchema.parse({
    ...input.wallet,
    powerUps: nextPu,
    updatedAt: input.now.toISOString(),
  });

  const perGame = { ...stats.perGame };
  const prevTitle = perGame[input.outcome.gameId];
  const titleStats = GamePerTitleStatsSchema.parse({
    plays: (prevTitle?.plays ?? 0) + 1,
    bestNetPu: Math.max(prevTitle?.bestNetPu ?? 0, netPu),
  });
  perGame[input.outcome.gameId] = titleStats;

  const puEarnedToday = stats.puEarnedToday + Math.max(0, netPu);
  const nextStats = GameStatsSchema.parse({
    dayStreak,
    bestStreak: Math.max(stats.bestStreak, dayStreak),
    puEarnedToday,
    puCapRemaining: Math.max(0, DAILY_GAME_PU_CAP - puEarnedToday),
    gamesPlayedToday: stats.gamesPlayedToday + 1,
    featuredGameId: featuredGameIdForUtcDate(input.now),
    firstGamePlayed: true,
    perGame,
  });

  const nextRoundIds = new Set(input.state.processedRoundIds);
  nextRoundIds.add(input.outcome.roundId);

  return {
    result: {
      ok: true,
      stats: nextStats,
      wallet: nextWallet,
      netPu,
    },
    state: {
      stats: nextStats,
      lastPlayDate: dateKey,
      processedRoundIds: nextRoundIds,
    },
    wallet: nextWallet,
  };
};

export const getGameStatsFromState = (input: {
  state: GamePlayerState;
  now: Date;
}): GameStats => {
  const dateKey = utcDateKey(input.now);
  if (input.state.lastPlayDate !== dateKey) {
    return createEmptyGameStats(input.now);
  }
  return {
    ...input.state.stats,
    featuredGameId: featuredGameIdForUtcDate(input.now),
    puCapRemaining: Math.max(
      0,
      DAILY_GAME_PU_CAP - input.state.stats.puEarnedToday
    ),
  };
};
