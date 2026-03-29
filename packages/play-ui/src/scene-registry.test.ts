import { describe, expect, it } from "vitest";
import {
  ACTIVE_SCENE_THEME,
  ENABLE_CROWD_LAYER,
  listSceneThemeIds,
} from "./scene-registry.js";

describe("scene registry", () => {
  it("crowd flag is boolean", () => {
    expect(typeof ENABLE_CROWD_LAYER).toBe("boolean");
  });

  it("includes active id in list", () => {
    expect(listSceneThemeIds()).toContain(ACTIVE_SCENE_THEME);
  });

  it("lists three standard themes", () => {
    expect(listSceneThemeIds()).toEqual([
      "park",
      "new_york",
      "tokyo",
    ]);
  });
});
