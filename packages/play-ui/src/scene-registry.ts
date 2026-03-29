export type SceneThemeId = "park" | "new_york" | "tokyo";

export const ACTIVE_SCENE_THEME: SceneThemeId = "park";

export const ENABLE_CROWD_LAYER: boolean = false;

export function listSceneThemeIds(): SceneThemeId[] {
  return ["park", "new_york", "tokyo"];
}
