import type { GameId } from "@agent-play/sdk/browser";

export type ArcadeCabinetPalette = {
  readonly body: number;
  readonly screen: number;
  readonly accent: number;
  readonly trim: number;
};

const PALETTES: Record<GameId, ArcadeCabinetPalette> = {
  "hidden-gems": {
    body: 0x4c1d95,
    screen: 0x1e1b4b,
    accent: 0xfbbf24,
    trim: 0xc4b5fd,
  },
  "map-recall": {
    body: 0x1e3a5f,
    screen: 0x0f172a,
    accent: 0x38bdf8,
    trim: 0x7dd3fc,
  },
  "price-check": {
    body: 0x14532d,
    screen: 0x052e16,
    accent: 0x4ade80,
    trim: 0x86efac,
  },
  "signal-hunt": {
    body: 0x7c2d12,
    screen: 0x431407,
    accent: 0xfb923c,
    trim: 0xfdba74,
  },
  "delivery-dash": {
    body: 0x1e40af,
    screen: 0x172554,
    accent: 0x60a5fa,
    trim: 0x93c5fd,
  },
  "lease-locker": {
    body: 0x57534e,
    screen: 0x292524,
    accent: 0xd6d3d1,
    trim: 0xe7e5e4,
  },
  "talk-timer": {
    body: 0x831843,
    screen: 0x500724,
    accent: 0xf472b6,
    trim: 0xfbcfe8,
  },
  "daily-rotator": {
    body: 0x713f12,
    screen: 0x422006,
    accent: 0xfde047,
    trim: 0xfef08a,
  },
};

export const arcadeCabinetPaletteForGame = (gameId: GameId): ArcadeCabinetPalette => {
  return PALETTES[gameId];
};
