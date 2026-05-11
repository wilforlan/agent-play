/**
 * @module @agent-play/play-ui/preview-settings-toolbar
 * preview settings toolbar — preview canvas module (Pixi + DOM).
 */
import { createPreviewAgentSettingsPanel } from "./preview-agent-settings-panel.js";
import { getPreviewAppMeta } from "./preview-app-meta.js";
import { ensurePreviewChatSettingsPanelStyles } from "./preview-chat-settings-panel.js";
import { createPreviewLanguageSettingsPanel } from "./preview-language-settings-panel.js";
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
  label.textContent = "Contribute";
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
  position: relative;
  width: 100vw;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  box-sizing: border-box;
  background: #0f172a;
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
body > .preview-shell {
  min-height: 100dvh;
}
.preview-game-panel {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
}
.preview-game-row {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.preview-canvas-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.preview-game-col {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  pointer-events: none;
}
.preview-game-col--center {
  z-index: 1;
}
.preview-game-col--left,
.preview-game-col--right {
  z-index: 35;
}
.preview-game-col--left > *,
.preview-game-col--right > * {
  pointer-events: auto;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--center {
  left: min(280px, 22vw);
  right: min(320px, 26vw);
  top: 0;
  bottom: 0;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--left {
  inset: 0 auto 0 0;
  width: min(280px, 22vw);
  overflow: visible;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--right {
  inset: 0 0 0 auto;
  width: min(320px, 26vw);
  overflow: visible;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--left .preview-floating-panel,
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--right .preview-floating-panel {
  max-width: 100%;
  box-sizing: border-box;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--left .preview-floating-panel--messages {
  width: min(360px, 100%);
  max-height: min(76dvh, calc(100dvh - 112px));
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--right .preview-floating-panel--session {
  width: min(380px, 100%);
  max-height: min(72dvh, calc((100dvh - 120px) / 2));
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--right .preview-floating-panel--debug {
  width: min(360px, 100%);
  max-height: min(72dvh, calc((100dvh - 120px) / 2));
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--left .preview-floating-panel .preview-floating-panel__body,
.preview-canvas-stage.preview-canvas-stage--stationary-panels .preview-game-col--right .preview-floating-panel .preview-floating-panel__body {
  min-height: 0;
  overflow-y: auto;
}
.preview-floating-panel {
  position: absolute;
  z-index: 40;
  width: min(360px, calc(100vw - 24px));
  max-height: min(64dvh, 560px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  padding: 6px 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.88);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.preview-floating-panel[hidden] {
  display: none;
}
.preview-floating-panel--collapsed {
  max-height: 58px;
}
.preview-floating-panel--session {
  width: min(380px, calc(100vw - 24px));
  max-height: min(76dvh, 680px);
}
.preview-floating-panel--debug {
  width: min(360px, calc(100vw - 24px));
}
.preview-floating-panel__drag {
  flex: 0 0 auto;
  width: 100%;
  min-height: 34px;
  margin: 0;
  padding: 0 10px 0 0;
  border: none;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background: rgba(51, 65, 85, 0.85);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.preview-floating-panel__drag:active {
  cursor: grabbing;
}
.preview-floating-panel__drag:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.85);
  outline-offset: 2px;
}
.preview-floating-panel__drag-grip {
  flex: 0 0 auto;
  width: 28px;
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}
.preview-floating-panel__drag-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-floating-panel__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
  opacity: 1;
  transform: translateY(0);
  transition:
    max-height 180ms ease,
    opacity 140ms ease,
    transform 180ms ease;
  max-height: min(76dvh, 680px);
}
.preview-floating-panel--collapsed .preview-floating-panel__body {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
}
.preview-debug-mount.preview-debug-mount--visible.preview-debug-mount--messages-hidden
  .preview-debug-panel:not(.preview-debug-panel--expanded) {
  flex: 0 0 auto;
  max-height: 48px;
  overflow: hidden;
}
.preview-debug-mount.preview-debug-mount--visible.preview-debug-mount--messages-hidden
  .preview-debug-panel:not(.preview-debug-panel--expanded)
  .preview-debug-panel__body {
  display: none;
}
.preview-debug-mount--messages-hidden .preview-debug-panel__title {
  cursor: pointer;
  user-select: none;
}
.preview-debug-mount--messages-hidden
  .preview-debug-panel.preview-debug-panel--expanded {
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(640px, 78vh);
  overflow: auto;
}
.preview-debug-mount--messages-hidden
  .preview-debug-panel.preview-debug-panel--expanded
  .preview-debug-panel__body {
  display: block;
}
.preview-mobile-side-backdrop {
  display: none;
}
.preview-mobile-side-toggles {
  display: none;
}
.preview-mobile-side-toggle {
  display: none;
}
.preview-canvas-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}
.preview-canvas-host {
  transform-origin: center center;
}
.preview-canvas-host canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.preview-joystick-wrap {
  position: absolute;
  left: 50%;
  bottom: max(76px, calc(12px + env(safe-area-inset-bottom, 0px)));
  transform: translateX(-50%);
  top: auto;
  z-index: 55;
  width: auto;
  pointer-events: auto;
}
.preview-debug-mount {
  display: none;
}
.preview-debug-mount.preview-debug-mount--visible {
  display: flex;
}
.preview-debug-mount.preview-debug-mount--visible .preview-debug-panel {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow: auto;
}
.preview-control-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
  align-items: stretch;
  box-sizing: border-box;
}
.preview-global-chat-room.preview-floating-panel,
.preview-floating-panel .preview-session-interaction,
.preview-floating-panel .preview-debug-panel {
  min-height: 0;
  border-color: rgba(148, 163, 184, 0.35);
  background: transparent;
  box-shadow: none;
}
.preview-floating-panel .preview-session-interaction,
.preview-floating-panel .preview-debug-panel {
  padding: 0;
  border: none;
  border-radius: 0;
}
.preview-proximity-legend {
  flex-shrink: 0;
  font: 600 0.625rem/1.35 ui-sans-serif, system-ui, sans-serif;
  color: #cbd5e1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.75);
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
.preview-proximity-touch-pad {
  position: absolute;
  z-index: 50;
  left: 0;
  right: 0;
  top: max(6px, env(safe-area-inset-top, 0px));
  width: fit-content;
  max-width: calc(100% - 12px);
  margin-left: auto;
  margin-right: auto;
  transform: none;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.88);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  box-sizing: border-box;
}
.preview-proximity-touch-pad__drag {
  flex: 0 0 auto;
  width: 28px;
  min-height: 52px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background: rgba(51, 65, 85, 0.85);
  color: #94a3b8;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-proximity-touch-pad__drag:active {
  cursor: grabbing;
}
.preview-proximity-touch-pad__drag:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.85);
  outline-offset: 2px;
}
.preview-proximity-touch-pad__buttons {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 10px;
}
.preview-proximity-touch-pad__key {
  flex: 0 0 auto;
  min-width: 72px;
  min-height: 52px;
  margin: 0;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  font-family: ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
  touch-action: manipulation;
  color: #f1f5f9;
  background: rgba(30, 41, 59, 0.95);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.preview-proximity-touch-pad__key:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.preview-proximity-touch-pad__key--assist:focus-visible,
.preview-proximity-touch-pad__key--chat:focus-visible,
.preview-proximity-touch-pad__key--ptt:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.85);
  outline-offset: 2px;
}
.preview-proximity-touch-pad__key-letter {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1;
}
.preview-proximity-touch-pad__key-sub {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  line-height: 1.1;
}
.preview-bottom-bar {
  position: absolute;
  left: max(16px, env(safe-area-inset-left, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 6px 8px;
  width: auto;
  margin: 0;
  box-sizing: border-box;
  z-index: 50;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  pointer-events: auto;
}
.preview-bottom-bar__collapse-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  margin: 0;
  padding: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  color: #f1f5f9;
  box-shadow: none;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}
.preview-bottom-bar__collapse-toggle:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.85);
  outline-offset: 2px;
}
.preview-bottom-bar__collapse-caret {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid currentColor;
  transition: transform 160ms ease;
}
.preview-bottom-bar__collapse-caret--collapsed {
  transform: rotate(180deg);
}
.preview-informatics-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
}
.preview-menu-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 6px;
  flex: 0 1 auto;
  min-width: 0;
}
.preview-bottom-bar .preview-chat-settings-toggle,
.preview-bottom-bar .preview-session-tools-toggle,
.preview-bottom-bar .preview-session-profile-toggle {
  min-height: 42px;
  padding: 6px 12px;
  border-radius: 0;
  border: none;
  background: transparent;
  color: #f1f5f9;
  box-shadow: none;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.preview-bottom-bar .preview-chat-settings-toggle:hover,
.preview-bottom-bar .preview-session-tools-toggle:hover,
.preview-bottom-bar .preview-session-profile-toggle:hover {
  background: transparent;
  border-color: transparent;
  color: #f8fafc;
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
  .preview-proximity-legend {
    display: none;
  }
  .preview-floating-panel {
    width: min(320px, calc(100vw - 20px));
    max-height: min(58dvh, 520px);
  }
  .preview-floating-panel--session {
    width: min(340px, calc(100vw - 20px));
  }
  .preview-joystick-wrap {
    left: 50%;
    bottom: max(64px, calc(10px + env(safe-area-inset-bottom, 0px)));
    transform: translateX(-50%);
    top: auto;
  }
  .preview-bottom-bar {
    left: max(10px, env(safe-area-inset-left, 0px));
    right: max(10px, env(safe-area-inset-right, 0px));
    bottom: max(10px, env(safe-area-inset-bottom, 0px));
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    align-content: stretch;
    gap: 3px;
    padding: 3px 4px;
  }
  .preview-bottom-bar--collapsed {
    gap: 0;
    padding: 2px 4px;
  }
  .preview-bottom-bar__collapse-toggle {
    display: inline-flex;
    align-self: flex-end;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 0;
  }
  .preview-bottom-bar__collapse-caret {
    border-left-width: 4px;
    border-right-width: 4px;
    border-top-width: 5px;
  }
  .preview-informatics-bar {
    display: none;
  }
  .preview-menu-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 3px;
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    justify-content: stretch;
    justify-items: stretch;
    overflow: hidden;
    transition:
      max-height 180ms ease,
      opacity 140ms ease,
      transform 180ms ease;
    max-height: 112px;
    opacity: 1;
    transform: translateY(0);
  }
  .preview-bottom-bar--collapsed .preview-menu-bar {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
    transform: translateY(6px);
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
    min-height: 28px;
    padding: 3px 5px;
    border-radius: 0;
    font-size: 0.5rem;
    line-height: 1.15;
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
    gap: 3px;
    max-height: 104px;
  }
  .preview-bottom-bar {
    left: max(6px, env(safe-area-inset-left, 0px));
    right: max(6px, env(safe-area-inset-right, 0px));
    bottom: max(6px, env(safe-area-inset-bottom, 0px));
    padding: 2px 3px;
    gap: 2px;
  }
  .preview-bottom-bar.preview-bottom-bar--collapsed {
    gap: 0;
    padding: 2px 3px;
  }
  .preview-bottom-bar__collapse-toggle {
    width: 26px;
    height: 26px;
    min-width: 26px;
    border-radius: 0;
  }
  .preview-proximity-touch-pad {
    max-width: calc(100vw - 24px);
    padding: 5px 6px;
    gap: 4px;
  }
  .preview-proximity-touch-pad__drag {
    width: 22px;
    min-height: 46px;
  }
  .preview-proximity-touch-pad__buttons {
    gap: 6px;
  }
  .preview-proximity-touch-pad__key {
    min-width: 56px;
    min-height: 46px;
    padding: 4px 8px;
  }
  .preview-proximity-touch-pad__key-letter {
    font-size: 1rem;
  }
  .preview-proximity-touch-pad__key-sub {
    font-size: 0.5625rem;
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
  display: inline;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #e2e8f0;
  background: none;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}
.preview-app-footer__docs:hover {
  color: #fff;
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
.preview-debug-panel__occupancy {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.28);
}
.preview-debug-panel__occupancy h4 {
  margin: 0 0 8px 0;
}
.preview-debug-panel__occupancy-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  color: #cbd5e1;
  cursor: pointer;
}
.preview-debug-panel__occupancy-row input {
  flex-shrink: 0;
  margin-top: 2px;
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
  /** When false, the Scene theme control is omitted (park-only watch UI). */
  includeThemePanel?: boolean;
}): HTMLElement {
  ensurePreviewLayoutStyles();
  const bar = document.createElement("div");
  bar.className = "preview-bottom-bar";
  const collapseToggle = document.createElement("button");
  collapseToggle.type = "button";
  collapseToggle.className = "preview-bottom-bar__collapse-toggle";
  collapseToggle.setAttribute("aria-label", "Hide toolbar menu");
  collapseToggle.setAttribute("aria-expanded", "true");
  const collapseCaret = document.createElement("span");
  collapseCaret.className = "preview-bottom-bar__collapse-caret";
  collapseCaret.setAttribute("aria-hidden", "true");
  collapseToggle.appendChild(collapseCaret);
  const informatics = document.createElement("div");
  informatics.className = "preview-informatics-bar";
  const docLink = document.createElement("a");
  docLink.className = "preview-app-footer__docs";
  docLink.href = DOC_BROWSER_HREF;
  docLink.textContent = "Read the docs";
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
  const includeThemePanel = options.includeThemePanel === true;
  menu.append(
    options.chatPanel,
    createPreviewLanguageSettingsPanel({}),
    options.sessionToolsPanel,
    options.sessionProfilePanel,
    ...(includeThemePanel
      ? [
          createPreviewThemeSettingsPanel({
            onThemeApplied: options.onThemeApplied,
          }),
        ]
      : []),
    createPreviewAgentSettingsPanel({
      onAgentSettingsChanged: options.onAgentSettingsChanged,
    })
  );
  collapseToggle.addEventListener("click", () => {
    const collapsed = !bar.classList.contains("preview-bottom-bar--collapsed");
    bar.classList.toggle("preview-bottom-bar--collapsed", collapsed);
    collapseToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    collapseToggle.setAttribute(
      "aria-label",
      collapsed ? "Show toolbar menu" : "Hide toolbar menu"
    );
    collapseCaret.classList.toggle(
      "preview-bottom-bar__collapse-caret--collapsed",
      collapsed
    );
  });
  bar.append(collapseToggle, informatics, menu);
  return bar;
}
