/**
 * @module @agent-play/play-ui/scene-theme
 * scene theme — preview canvas module (Pixi + DOM).
 */
import type { Container } from "pixi.js";
import type { MultiversePalette } from "./multiverse-engine.js";
import {
  buildNewYorkScene,
  buildParkScene,
  buildTokyoScene,
} from "./scene-backgrounds.js";
import {
  ACTIVE_SCENE_THEME,
  type SceneThemeId,
} from "./scene-registry.js";

export type { SceneThemeId } from "./scene-registry.js";
export {
  ACTIVE_SCENE_THEME,
  ENABLE_CROWD_LAYER,
  listSceneThemeIds,
} from "./scene-registry.js";

export type SceneTheme = {
  id: SceneThemeId;
  appBackgroundColor: number;
  buildScene: (width: number, height: number, seed: number) => Container;
  crowdSeedSalt: number;
  grassBandTopRatio: number;
  gridStroke: { color: number; alpha: number };
  palettePartial: Partial<MultiversePalette>;
  house: {
    wall: number;
    roof: number;
    door: number;
    window: number;
    trim: number;
  };
};

const themes: Record<SceneThemeId, SceneTheme> = {
  park: {
    id: "park",
    appBackgroundColor: 0x87ceeb,
    buildScene: buildParkScene,
    crowdSeedSalt: 0x11,
    grassBandTopRatio: 0.58,
    gridStroke: { color: 0x94a3b8, alpha: 0.28 },
    palettePartial: {
      text: "#0f172a",
      textMuted: "#334155",
      stroke: "#1e293b",
      structureTool: "#2563eb",
      structureHome: "#ea580c",
    },
    house: {
      wall: 0xf5e6c8,
      roof: 0xc62828,
      door: 0x4e342e,
      window: 0x90caf9,
      trim: 0xffffff,
    },
  },
  new_york: {
    id: "new_york",
    appBackgroundColor: 0x5c6f82,
    buildScene: buildNewYorkScene,
    crowdSeedSalt: 0x22,
    grassBandTopRatio: 0.58,
    gridStroke: { color: 0xfacc15, alpha: 0.26 },
    palettePartial: {
      text: "#f8fafc",
      textMuted: "#cbd5e1",
      stroke: "#e2e8f0",
      structureTool: "#38bdf8",
      structureHome: "#f97316",
    },
    house: {
      wall: 0x8d6e63,
      roof: 0x3e2723,
      door: 0x212121,
      window: 0xffecb3,
      trim: 0x5d4037,
    },
  },
  tokyo: {
    id: "tokyo",
    appBackgroundColor: 0x1a2332,
    buildScene: buildTokyoScene,
    crowdSeedSalt: 0x33,
    grassBandTopRatio: 0.58,
    gridStroke: { color: 0x94a3b8, alpha: 0.32 },
    palettePartial: {
      text: "#fce4ec",
      textMuted: "#f48fb1",
      stroke: "#f8bbd0",
      structureTool: "#22d3ee",
      structureHome: "#fb7185",
    },
    house: {
      wall: 0xfce4ec,
      roof: 0x1a237e,
      door: 0x3e2723,
      window: 0xfff59d,
      trim: 0xad1457,
    },
  },
};

export function getActiveSceneTheme(): SceneTheme {
  return themes.park;
}
