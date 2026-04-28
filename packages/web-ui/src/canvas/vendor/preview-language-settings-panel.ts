/**
 * @module @agent-play/play-ui/preview-language-settings-panel
 * preview language settings panel — preview canvas module (Pixi + DOM).
 */
import {
  getPreviewViewSettings,
  PREVIEW_LANGUAGE_OPTIONS,
  setPreviewViewSettings,
  type PreviewLanguage,
} from "./preview-view-settings.js";

type LanguageOption = (typeof PREVIEW_LANGUAGE_OPTIONS)[number];

function buildToggleLabel(language: LanguageOption): string {
  return `Language - ${language}`;
}

function isPreviewLanguage(value: string): value is PreviewLanguage {
  return (PREVIEW_LANGUAGE_OPTIONS as readonly string[]).includes(value);
}

export function createPreviewLanguageSettingsPanel(options: {
  onLanguageChanged?: (language: PreviewLanguage) => void;
}): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className =
    "preview-chat-settings-wrap preview-chat-settings-wrap--toolbar preview-language-settings-wrap";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-chat-settings-toggle preview-language-settings-toggle";

  const panel = document.createElement("div");
  panel.className = "preview-chat-settings-panel preview-language-settings-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Language settings");

  const row = document.createElement("div");
  row.className = "preview-chat-settings-row";
  const label = document.createElement("label");
  label.textContent = "Voice response language";
  const select = document.createElement("select");
  select.className = "preview-language-settings-select";

  for (const language of PREVIEW_LANGUAGE_OPTIONS) {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language;
    select.appendChild(option);
  }

  const syncFromState = (): void => {
    const language = getPreviewViewSettings().language;
    select.value = language;
    toggle.textContent = buildToggleLabel(language);
  };

  select.addEventListener("change", () => {
    if (!isPreviewLanguage(select.value)) {
      return;
    }
    const selected = select.value;
    const next = setPreviewViewSettings({ language: selected });
    toggle.textContent = buildToggleLabel(next.language);
    options.onLanguageChanged?.(next.language);
  });

  label.appendChild(select);
  row.appendChild(label);
  panel.appendChild(row);

  toggle.addEventListener("click", () => {
    panel.classList.toggle("preview-chat-settings-panel--open");
  });

  wrap.append(toggle, panel);
  syncFromState();
  return wrap;
}
