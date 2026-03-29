import { createPreviewAgentSettingsPanel } from "./preview-agent-settings-panel.js";
import { getPreviewAppMeta } from "./preview-app-meta.js";
import { ensurePreviewChatSettingsPanelStyles } from "./preview-chat-settings-panel.js";
import { createPreviewThemeSettingsPanel } from "./preview-theme-settings-panel.js";

const TOOLBAR_STYLE_ID = "agent-play-preview-settings-toolbar-styles";

function appendGithubIcon(link: HTMLAnchorElement): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("preview-app-footer__github-icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
  );
  svg.appendChild(path);
  const label = document.createElement("span");
  label.textContent = "Source";
  link.append(svg, label);
}

export function ensurePreviewLayoutStyles(): void {
  ensurePreviewChatSettingsPanelStyles();
  ensurePreviewSettingsToolbarStyles();
}

function ensurePreviewSettingsToolbarStyles(): void {
  if (document.getElementById(TOOLBAR_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = TOOLBAR_STYLE_ID;
  s.textContent = `
.preview-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  padding-top: 20px;
  padding-left: 12px;
  padding-right: 12px;
}
body > .preview-shell {
  min-height: 100vh;
}
.preview-game-panel {
  flex: 0 0 auto;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  height: min(750px, 92vh);
  min-height: 400px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.preview-game-row {
  display: grid;
  grid-template-columns: minmax(0, 20fr) minmax(0, 60fr) minmax(0, 20fr);
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.preview-game-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.preview-game-col--center {
  align-items: center;
}
.preview-canvas-wrap {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}
.preview-joystick-wrap {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 4px;
  width: 100%;
}
.preview-debug-mount {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  display: none;
}
.preview-debug-mount.preview-debug-mount--visible {
  display: block;
}
.preview-control-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  align-items: stretch;
}
.preview-proximity-legend {
  font: 600 13px/1.45 system-ui, sans-serif;
  color: #cbd5e1;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.72);
}
.preview-proximity-hint {
  display: none;
  position: fixed;
  bottom: 132px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  max-width: min(520px, 92vw);
  padding: 8px 14px;
  border-radius: 10px;
  font: 600 12px/1.35 system-ui, sans-serif;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.4);
  text-align: center;
  pointer-events: none;
}
.preview-bottom-bar {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px 20px;
  padding: 12px 4px 16px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
  z-index: 50;
}
.preview-informatics-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 1 auto;
  min-width: 0;
}
.preview-menu-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
}
.preview-menu-bar .preview-chat-settings-wrap,
.preview-menu-bar .preview-session-tools-wrap,
.preview-menu-bar .preview-session-profile-wrap {
  position: relative;
  width: auto;
  max-width: none;
}
.preview-menu-bar .preview-chat-settings-panel,
.preview-menu-bar .preview-session-tools-panel,
.preview-menu-bar .preview-session-profile-panel {
  position: absolute;
  bottom: 100%;
  left: auto;
  right: 0;
  margin-top: 0;
  margin-bottom: 8px;
  z-index: 60;
  max-height: min(70vh, 420px);
  overflow-y: auto;
}
.preview-app-footer {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: #94a3b8;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.preview-app-footer__version {
  white-space: nowrap;
}
.preview-app-footer__repo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e2e8f0;
  text-decoration: none;
  white-space: nowrap;
}
.preview-app-footer__repo:hover {
  color: #f8fafc;
}
.preview-app-footer__github-icon {
  flex-shrink: 0;
  display: block;
}
.preview-debug-panel {
  box-sizing: border-box;
  margin: 4px 0;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.96);
  color: #e2e8f0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  max-height: min(640px, 78vh);
  overflow: auto;
}
.preview-debug-panel__title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 10px;
  color: #f1f5f9;
}
.preview-debug-panel__body h4 {
  margin: 12px 0 8px 0;
  font-size: 12px;
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
  font-size: 11px;
  color: #cbd5e1;
}
`;
  document.head.append(s);
}

export function createPreviewBottomBar(options: {
  chatPanel: HTMLElement;
  sessionToolsPanel: HTMLElement;
  sessionProfilePanel: HTMLElement;
  onThemeApplied: () => void;
  onAgentSettingsChanged: () => void;
}): HTMLElement {
  ensurePreviewLayoutStyles();
  const bar = document.createElement("div");
  bar.className = "preview-bottom-bar";
  const informatics = document.createElement("div");
  informatics.className = "preview-informatics-bar";
  const meta = getPreviewAppMeta();
  const footer = document.createElement("div");
  footer.className = "preview-app-footer";
  const ver = document.createElement("span");
  ver.className = "preview-app-footer__version";
  ver.textContent = `v${meta.version}`;
  const link = document.createElement("a");
  link.className = "preview-app-footer__repo";
  link.href = meta.repoUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "View source on GitHub");
  appendGithubIcon(link);
  footer.append(ver, link);
  informatics.appendChild(footer);
  const menu = document.createElement("div");
  menu.className = "preview-menu-bar";
  menu.append(
    options.chatPanel,
    options.sessionToolsPanel,
    options.sessionProfilePanel,
    createPreviewThemeSettingsPanel({
      onThemeApplied: options.onThemeApplied,
    }),
    createPreviewAgentSettingsPanel({
      onAgentSettingsChanged: options.onAgentSettingsChanged,
    })
  );
  bar.append(informatics, menu);
  return bar;
}
