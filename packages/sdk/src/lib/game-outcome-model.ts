import { z } from "zod";
import type { GameId } from "./game-catalog.js";
import { featuredGameIdForUtcDate, isGameId } from "./game-catalog.js";

export const DAILY_GAME_PU_CAP = 100;
export const STREAK_BONUS_PU = 5;
export const STREAK_BONUS_THRESHOLD_DAYS = 5;

export const GameEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chest_open"),
    correct: z.boolean(),
    tutorial: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("sequence_step"),
    correct: z.boolean(),
    tutorial: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("price_guess"),
    correct: z.boolean(),
    round: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("signal_pick"),
    correct: z.boolean(),
  }),
  z.object({
    type: z.literal("delivery_finish"),
    band: z.enum(["fast", "ok", "slow"]),
    hits: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("door_pick"),
    correct: z.boolean(),
  }),
  z.object({
    type: z.literal("talk_release"),
    success: z.boolean(),
    round: z.number().int().min(1).max(3),
  }),
]);

export type GameEvent = z.infer<typeof GameEventSchema>;

export const ApplyGameOutcomeInputSchema = z.object({
  gameId: z.string().refine(isGameId, "invalid gameId"),
  roundId: z.string().min(1),
  events: z.array(GameEventSchema).min(1),
});

export type ApplyGameOutcomeInput = z.infer<typeof ApplyGameOutcomeInputSchema>;

export const GamePerTitleStatsSchema = z.object({
  plays: z.number().int().min(0),
  bestNetPu: z.number().int(),
});

export type GamePerTitleStats = z.infer<typeof GamePerTitleStatsSchema>;

export const GameStatsSchema = z.object({
  dayStreak: z.number().int().min(0),
  bestStreak: z.number().int().min(0),
  puEarnedToday: z.number().int().min(0),
  puCapRemaining: z.number().int().min(0),
  gamesPlayedToday: z.number().int().min(0),
  featuredGameId: z.string(),
  firstGamePlayed: z.boolean(),
  perGame: z.record(z.string(), GamePerTitleStatsSchema),
});

export type GameStats = z.infer<typeof GameStatsSchema>;

export const computeEventPuDelta = (event: GameEvent): number => {
  switch (event.type) {
    case "chest_open":
      if (event.tutorial === true) {
        return event.correct ? 5 : 0;
      }
      return event.correct ? 8 : -2;
    case "sequence_step":
      if (event.tutorial === true) {
        return event.correct ? 4 : 0;
      }
      return event.correct ? 4 : -2;
    case "price_guess":
      if (event.round === 1 && !event.correct) return 0;
      return event.correct ? 4 : -1;
    case "signal_pick":
      return event.correct ? 8 : -3;
    case "delivery_finish": {
      const bandPu =
        event.band === "fast" ? 15 : event.band === "ok" ? 8 : 3;
      return bandPu - event.hits * 2;
    }
    case "door_pick":
      return event.correct ? 6 : -4;
    case "talk_release":
      return event.success ? 5 : -2;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return 0;
    }
  }
};

export const computeRoundPuDelta = (events: readonly GameEvent[]): number => {
  return events.reduce((sum, e) => sum + computeEventPuDelta(e), 0);
};

export const utcDateKey = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const createEmptyGameStats = (date: Date): GameStats => {
  return GameStatsSchema.parse({
    dayStreak: 0,
    bestStreak: 0,
    puEarnedToday: 0,
    puCapRemaining: DAILY_GAME_PU_CAP,
    gamesPlayedToday: 0,
    featuredGameId: featuredGameIdForUtcDate(date),
    firstGamePlayed: false,
    perGame: {},
  });
};

export const resolveFeaturedGameId = (date: Date): GameId => {
  return featuredGameIdForUtcDate(date);
};
