import { createPreviewAgentSettingsPanel } from "./preview-agent-settings-panel.js";
import { ensurePreviewChatSettingsPanelStyles } from "./preview-chat-settings-panel.js";
import { createPreviewThemeSettingsPanel } from "./preview-theme-settings-panel.js";

const TOOLBAR_STYLE_ID = "agent-play-preview-settings-toolbar-styles";

function ensurePreviewSettingsToolbarStyles(): void {
  if (document.getElementById(TOOLBAR_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = TOOLBAR_STYLE_ID;
  s.textContent = `
.preview-settings-toolbar {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: calc(100vw - 24px);
}
.preview-world-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}
.preview-debug-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.preview-debug-mount {
  flex: 0 0 auto;
  width: min(320px, 92vw);
  max-height: 520px;
  overflow: hidden;
  display: none;
  margin: 12px 16px 12px 12px;
}
.preview-debug-mount.preview-debug-mount--visible {
  display: block;
}
.preview-debug-panel {
  box-sizing: border-box;
  margin: 4px 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.96);
  color: #e2e8f0;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.45;
  max-height: 520px;
  overflow: auto;
}
.preview-debug-panel__title {
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 8px;
  color: #f1f5f9;
}
.preview-debug-panel__body h4 {
  margin: 10px 0 6px 0;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.preview-debug-panel__body h4:first-child {
  margin-top: 0;
}
.preview-debug-panel__body ul {
  margin: 0;
  padding-left: 1.1em;
}
.preview-debug-panel__body li {
  margin: 0.35em 0;
}
.preview-debug-panel__body code {
  font-size: 10px;
  color: #cbd5e1;
}
`;
  document.head.append(s);
}

export function createPreviewSettingsToolbar(options: {
  chatPanel: HTMLElement;
  onThemeApplied: () => void;
  onAgentSettingsChanged: () => void;
}): HTMLElement {
  ensurePreviewChatSettingsPanelStyles();
  ensurePreviewSettingsToolbarStyles();
  const bar = document.createElement("div");
  bar.className = "preview-settings-toolbar";
  bar.append(
    options.chatPanel,
    createPreviewThemeSettingsPanel({
      onThemeApplied: options.onThemeApplied,
    }),
    createPreviewAgentSettingsPanel({
      onAgentSettingsChanged: options.onAgentSettingsChanged,
    })
  );
  return bar;
}
