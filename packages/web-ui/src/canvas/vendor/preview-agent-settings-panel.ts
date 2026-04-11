/**
 * @module @agent-play/play-ui/preview-agent-settings-panel
 * preview agent settings panel — preview canvas module (Pixi + DOM).
 */
import {
  getPreviewViewSettings,
  setPreviewViewSettings,
  type PreviewViewSettings,
} from "./preview-view-settings.js";

type CheckboxKey = keyof Pick<
  PreviewViewSettings,
  "showChatUi" | "debugMode" | "joystickEnabled"
>;

export function createPreviewAgentSettingsPanel(options: {
  onAgentSettingsChanged: () => void;
}): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className =
    "preview-chat-settings-wrap preview-chat-settings-wrap--toolbar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-chat-settings-toggle";
  toggle.textContent = "Agents";

  const panel = document.createElement("div");
  panel.className = "preview-chat-settings-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Agent display settings");

  const mkCheck = (
    label: string,
    key: CheckboxKey,
    hint: string
  ): { row: HTMLElement; input: HTMLInputElement } => {
    const row = document.createElement("div");
    row.className = "preview-chat-settings-row";
    const lab = document.createElement("label");
    lab.style.cssText = "flex-direction:column;align-items:flex-start;gap:4px;";
    const top = document.createElement("div");
    top.style.cssText =
      "display:flex;align-items:center;gap:8px;width:100%;justify-content:space-between;";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = getPreviewViewSettings()[key];
    input.addEventListener("change", () => {
      setPreviewViewSettings({ [key]: input.checked });
      options.onAgentSettingsChanged();
    });
    top.append(span, input);
    const sub = document.createElement("div");
    sub.style.cssText = "font-size:11px;color:#94a3b8;font-weight:400;";
    sub.textContent = hint;
    lab.append(top, sub);
    row.appendChild(lab);
    return { row, input };
  };

  const showChat = mkCheck(
    "Show chat UI",
    "showChatUi",
    "When off, only agent movement and the world are shown."
  );
  const debug = mkCheck(
    "Debug mode",
    "debugMode",
    "Show world coordinates for agents and structures beside the preview."
  );
  const joystick = mkCheck(
    "Enable joystick",
    "joystickEnabled",
    "Drag the on-canvas stick to move your avatar in world space. Arrow keys also move you."
  );

  panel.append(showChat.row, debug.row, joystick.row);

  toggle.addEventListener("click", () => {
    panel.classList.toggle("preview-chat-settings-panel--open");
  });

  wrap.append(toggle, panel);
  return wrap;
}
