import type { AgentChatDisplaySettings } from "./preview-chat-settings.js";
import {
  getAgentChatDisplaySettings,
  resetAgentChatDisplaySettings,
  setAgentChatDisplaySettings,
} from "./preview-chat-settings.js";

const SETTINGS_STYLE_ID = "agent-play-preview-chat-settings-ui-styles";

export function ensurePreviewChatSettingsPanelStyles(): void {
  if (document.getElementById(SETTINGS_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = SETTINGS_STYLE_ID;
  s.textContent = `
.preview-chat-settings-wrap {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  color: #e2e8f0;
}
.preview-chat-settings-wrap.preview-chat-settings-wrap--toolbar {
  position: relative;
  right: auto;
  bottom: auto;
  z-index: auto;
}
.preview-chat-settings-toggle {
  pointer-events: auto;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  cursor: pointer;
}
.preview-chat-settings-toggle:hover {
  background: rgba(30, 41, 59, 0.95);
}
.preview-chat-settings-panel {
  display: none;
  margin-top: 8px;
  padding: 12px;
  width: 260px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.preview-chat-settings-panel.preview-chat-settings-panel--open {
  display: block;
}
.preview-chat-settings-row {
  margin-bottom: 10px;
}
.preview-chat-settings-row:last-child {
  margin-bottom: 0;
}
.preview-chat-settings-row label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #cbd5e1;
}
.preview-chat-settings-row input[type="range"] {
  width: 100%;
}
.preview-chat-settings-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.preview-chat-settings-actions button {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(51, 65, 85, 0.9);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
}
.preview-chat-settings-actions button:hover {
  background: rgba(71, 85, 105, 0.95);
}
`;
  document.head.append(s);
}

function syncControls(
  root: HTMLElement,
  settings: AgentChatDisplaySettings
): void {
  root.querySelectorAll<HTMLInputElement>("input[data-setting]").forEach(
    (input) => {
      const key = input.getAttribute("data-setting");
      if (key === "fontSizePx") input.value = String(settings.fontSizePx);
      if (key === "panelWidthPx") input.value = String(settings.panelWidthPx);
      if (key === "scrollMaxHeightPx") {
        input.value = String(settings.scrollMaxHeightPx);
      }
    }
  );
  root.querySelectorAll("[data-value-for]").forEach((el) => {
    const key = el.getAttribute("data-value-for");
    if (key === "fontSizePx") el.textContent = `${settings.fontSizePx}px`;
    if (key === "panelWidthPx") el.textContent = `${settings.panelWidthPx}px`;
    if (key === "scrollMaxHeightPx") {
      el.textContent = `${settings.scrollMaxHeightPx}px`;
    }
  });
}

export function createPreviewChatSettingsPanel(options: {
  onSettingsApplied: (settings: AgentChatDisplaySettings) => void;
  embeddedInToolbar?: boolean;
}): HTMLElement {
  ensurePreviewChatSettingsPanelStyles();

  const wrap = document.createElement("div");
  wrap.className = "preview-chat-settings-wrap";
  if (options.embeddedInToolbar === true) {
    wrap.classList.add("preview-chat-settings-wrap--toolbar");
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-chat-settings-toggle";
  toggle.textContent = "Chat display";

  const panel = document.createElement("div");
  panel.className = "preview-chat-settings-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat display settings");

  const mkRow = (
    label: string,
    key: keyof AgentChatDisplaySettings,
    min: number,
    max: number,
    step: number
  ): HTMLElement => {
    const row = document.createElement("div");
    row.className = "preview-chat-settings-row";
    const lab = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = label;
    const val = document.createElement("span");
    val.setAttribute("data-value-for", key);
    lab.append(span, val);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.setAttribute("data-setting", key);
    input.addEventListener("input", () => {
      const num = Number(input.value);
      const next = setAgentChatDisplaySettings({ [key]: num });
      syncControls(wrap, next);
      options.onSettingsApplied(next);
    });
    row.append(lab, input);
    return row;
  };

  panel.append(
    mkRow("Font size", "fontSizePx", 5, 18, 1),
    mkRow("Panel width", "panelWidthPx", 100, 400, 4),
    mkRow("Panel scroll height", "scrollMaxHeightPx", 24, 200, 4)
  );

  const actions = document.createElement("div");
  actions.className = "preview-chat-settings-actions";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Reset defaults";
  resetBtn.addEventListener("click", () => {
    const next = resetAgentChatDisplaySettings();
    syncControls(wrap, next);
    options.onSettingsApplied(next);
  });
  actions.appendChild(resetBtn);
  panel.appendChild(actions);

  toggle.addEventListener("click", () => {
    panel.classList.toggle("preview-chat-settings-panel--open");
  });

  wrap.append(toggle, panel);
  syncControls(wrap, getAgentChatDisplaySettings());

  return wrap;
}
