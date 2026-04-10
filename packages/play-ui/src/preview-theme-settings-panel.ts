/**
 * @module @agent-play/play-ui/preview-theme-settings-panel
 * preview theme settings panel — preview canvas module (Pixi + DOM).
 */
import type { SceneThemeId } from "./scene-registry.js";
import { listSceneThemeIds } from "./scene-registry.js";
import {
  getPreviewViewSettings,
  setPreviewViewSettings,
} from "./preview-view-settings.js";

function themeLabel(id: SceneThemeId): string {
  if (id === "park") return "Park";
  if (id === "new_york") return "New York";
  return "Tokyo";
}

export function createPreviewThemeSettingsPanel(options: {
  onThemeApplied: () => void;
}): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className =
    "preview-chat-settings-wrap preview-chat-settings-wrap--toolbar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-chat-settings-toggle";
  toggle.textContent = "Theme";

  const panel = document.createElement("div");
  panel.className = "preview-chat-settings-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Scene theme");

  const row = document.createElement("div");
  row.className = "preview-chat-settings-row";
  const lab = document.createElement("label");
  lab.style.cssText = "display:block;margin-bottom:6px;color:#cbd5e1;";
  lab.textContent = "World theme";

  const select = document.createElement("select");
  select.style.cssText =
    "width:100%;padding:6px 8px;border-radius:6px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;box-sizing:border-box;";
  for (const id of listSceneThemeIds()) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = themeLabel(id);
    select.appendChild(opt);
  }
  select.value = getPreviewViewSettings().themeId;
  select.addEventListener("change", () => {
    const v = select.value;
    if (v === "park" || v === "new_york" || v === "tokyo") {
      setPreviewViewSettings({ themeId: v });
      options.onThemeApplied();
    }
  });

  row.append(lab, select);
  panel.appendChild(row);

  toggle.addEventListener("click", () => {
    panel.classList.toggle("preview-chat-settings-panel--open");
  });

  wrap.append(toggle, panel);
  return wrap;
}
