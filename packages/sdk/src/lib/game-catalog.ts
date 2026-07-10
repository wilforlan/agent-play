export type GameId =
  | "hidden-gems"
  | "map-recall"
  | "price-check"
  | "signal-hunt"
  | "delivery-dash"
  | "lease-locker"
  | "talk-timer"
  | "daily-rotator";

export type GameCabinetEntry = {
  readonly id: string;
  readonly gameId: GameId;
  readonly name: string;
};

export const GAME_CABINET_CATALOG: readonly GameCabinetEntry[] = [
  { id: "arcade-hidden-gems", gameId: "hidden-gems", name: "Gem Chest" },
  { id: "arcade-map-recall", gameId: "map-recall", name: "Map Room" },
  { id: "arcade-price-check", gameId: "price-check", name: "Price Tag" },
  { id: "arcade-signal-hunt", gameId: "signal-hunt", name: "Signal Tower" },
  { id: "arcade-delivery-dash", gameId: "delivery-dash", name: "Courier Lane" },
  { id: "arcade-lease-locker", gameId: "lease-locker", name: "Locker Hall" },
  { id: "arcade-talk-timer", gameId: "talk-timer", name: "Comms Booth" },
  { id: "arcade-daily-rotator", gameId: "daily-rotator", name: "Featured" },
] as const;

export const PLAYABLE_GAME_IDS: readonly GameId[] = [
  "hidden-gems",
  "map-recall",
  "price-check",
  "signal-hunt",
  "delivery-dash",
  "lease-locker",
  "talk-timer",
] as const;

export const getGameCabinetById = (
  id: string
): GameCabinetEntry | undefined => {
  return GAME_CABINET_CATALOG.find((c) => c.id === id);
};

export const getGameCabinetByGameId = (
  gameId: GameId
): GameCabinetEntry | undefined => {
  return GAME_CABINET_CATALOG.find((c) => c.gameId === gameId);
};

const ROTATOR_SCHEDULE: readonly GameId[] = [
  "hidden-gems",
  "map-recall",
  "price-check",
  "signal-hunt",
  "delivery-dash",
  "lease-locker",
  "talk-timer",
] as const;

export const featuredGameIdForUtcDate = (date: Date): GameId => {
  const day = date.getUTCDay();
  const index = day === 0 ? 6 : day - 1;
  const featured = ROTATOR_SCHEDULE[index];
  if (featured === undefined) {
    return "hidden-gems";
  }
  return featured;
};

const GAME_ID_SET = new Set<string>([
  "hidden-gems",
  "map-recall",
  "price-check",
  "signal-hunt",
  "delivery-dash",
  "lease-locker",
  "talk-timer",
  "daily-rotator",
]);

export const isGameId = (value: string): value is GameId => {
  return GAME_ID_SET.has(value);
};
