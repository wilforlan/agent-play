/**
 * @module @agent-play/play-ui/preview-settings-toolbar
 * preview settings toolbar — preview canvas module (Pixi + DOM).
 */
import { createPreviewAgentSettingsPanel } from "./preview-agent-settings-panel.js";
import { getPreviewAppMeta } from "./preview-app-meta.js";
import { ensurePreviewChatSettingsPanelStyles } from "./preview-chat-settings-panel.js";
import { createPreviewThemeSettingsPanel } from "./preview-theme-settings-panel.js";

const TOOLBAR_STYLE_ID = "agent-play-preview-settings-toolbar-styles";

const DOC_BROWSER_HREF = "/doc";

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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.preview-canvas-stage {
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
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.preview-game-col--center {
  align-items: center;
  position: relative;
}
.preview-mobile-side-backdrop {
  display: none;
}
.preview-mobile-side-toggles {
  display: none;
}
.preview-mobile-side-toggle {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  color: #f1f5f9;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  padding: 10px 14px;
  min-height: 44px;
  min-width: 44px;
}
.preview-mobile-side-toggle:hover {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(129, 140, 248, 0.55);
}
.preview-mobile-side-toggle:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.85);
  outline-offset: 2px;
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
  overflow: hidden;
  align-items: stretch;
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}
.preview-proximity-legend {
  flex-shrink: 0;
  font: 600 13px/1.45 system-ui, sans-serif;
  color: #cbd5e1;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.72);
}
.preview-proximity-prompt {
  display: none;
  position: absolute;
  z-index: 15;
  transform: translate(-50%, -100%);
  white-space: pre;
  text-align: center;
  font: 600 10px/1.25 system-ui, sans-serif;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  padding: 5px 8px;
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
@media (max-width: 1023px) {
  body > .preview-shell {
    min-height: 100dvh;
  }
  .preview-shell {
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
    padding-top: max(10px, env(safe-area-inset-top));
    padding-left: max(10px, env(safe-area-inset-left));
    padding-right: max(10px, env(safe-area-inset-right));
    padding-bottom: max(4px, env(safe-area-inset-bottom));
  }
  .preview-game-panel {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
    max-height: none;
  }
  .preview-canvas-stage {
    display: block;
    position: relative;
    flex: 1 1 auto;
    min-height: min(480px, calc(100dvh - 260px));
    overflow: hidden;
  }
  .preview-canvas-stage .preview-game-col--left,
  .preview-canvas-stage .preview-game-col--right {
    position: absolute;
    top: max(6px, env(safe-area-inset-top));
    bottom: 76px;
    width: min(320px, calc(100vw - 36px));
    max-height: calc(100% - 6px);
    z-index: 30;
    margin: 0;
    padding-top: 4px;
    padding-bottom: 8px;
    padding-left: 6px;
    padding-right: 6px;
    box-sizing: border-box;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(148, 163, 184, 0.35);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    pointer-events: none;
    transform: translateX(-108%);
    transition: transform 0.25s ease, visibility 0.25s ease;
    visibility: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .preview-canvas-stage .preview-control-stack {
    padding-bottom: max(28px, calc(16px + env(safe-area-inset-bottom, 0px)));
  }
  .preview-canvas-stage .preview-game-col--right {
    right: 0;
    left: auto;
    transform: translateX(108%);
  }
  .preview-shell.preview-side-left-open .preview-canvas-stage .preview-game-col--left,
  .preview-shell.preview-side-right-open .preview-canvas-stage .preview-game-col--right {
    transform: translateX(0);
    pointer-events: auto;
    visibility: visible;
  }
  .preview-canvas-stage .preview-game-col--center {
    position: absolute;
    inset: 0;
    z-index: 1;
    align-items: stretch;
    justify-content: flex-start;
  }
  .preview-canvas-wrap {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    align-items: center;
    justify-content: center;
  }
  .preview-mobile-side-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 20;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    cursor: pointer;
    background: rgba(2, 6, 23, 0.42);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .preview-shell.preview-side-left-open .preview-mobile-side-backdrop,
  .preview-shell.preview-side-right-open .preview-mobile-side-backdrop {
    opacity: 1;
    pointer-events: auto;
  }
  .preview-mobile-side-toggles {
    display: flex;
    position: absolute;
    bottom: max(8px, env(safe-area-inset-bottom));
    left: max(8px, env(safe-area-inset-left));
    right: max(8px, env(safe-area-inset-right));
    z-index: 40;
    justify-content: space-between;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;
  }
  .preview-mobile-side-toggles .preview-mobile-side-toggle {
    pointer-events: auto;
    flex: 0 0 auto;
  }
  .preview-proximity-legend {
    display: none;
  }
  .preview-bottom-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 10px 2px 14px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
  .preview-informatics-bar {
    flex-wrap: wrap;
    gap: 10px;
    row-gap: 8px;
    width: 100%;
  }
  .preview-menu-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    justify-content: stretch;
    justify-items: stretch;
  }
  .preview-menu-bar > * {
    min-width: 0;
    width: 100%;
  }
  .preview-menu-bar .preview-chat-settings-wrap,
  .preview-menu-bar .preview-session-tools-wrap,
  .preview-menu-bar .preview-session-profile-wrap {
    width: 100%;
  }
  .preview-menu-bar .preview-chat-settings-toggle,
  .preview-menu-bar .preview-session-tools-toggle,
  .preview-menu-bar .preview-session-profile-toggle {
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    min-height: 44px;
  }
  .preview-menu-bar .preview-chat-settings-panel,
  .preview-menu-bar .preview-session-tools-panel,
  .preview-menu-bar .preview-session-profile-panel {
    left: 0;
    right: 0;
    width: auto;
    max-width: none;
    max-height: min(55vh, 400px);
    margin-bottom: 10px;
  }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .preview-canvas-stage .preview-game-col--left,
  .preview-canvas-stage .preview-game-col--right {
    width: min(400px, calc(100vw - 48px));
  }
  .preview-mobile-side-toggle {
    padding: 12px 18px;
    font-size: 0.875rem;
  }
}
@media (max-width: 480px) {
  .preview-menu-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
.preview-app-footer__docs {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.35);
  text-decoration: none;
  white-space: nowrap;
}
.preview-app-footer__docs:hover {
  color: #fff;
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(30, 41, 59, 0.92);
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
  const docLink = document.createElement("a");
  docLink.className = "preview-app-footer__docs";
  docLink.href = DOC_BROWSER_HREF;
  docLink.textContent = "Documentation";
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
  informatics.append(docLink, footer);
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
