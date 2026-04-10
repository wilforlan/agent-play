/**
 * @module @agent-play/play-ui/preview-session-profile-panel
 * preview session profile panel — preview canvas module (Pixi + DOM).
 */
import {
  getPreviewViewSettings,
  setPreviewViewSettings,
  type ProfileAvatarPresetId,
  type ProfileGender,
} from "./preview-view-settings.js";

const STYLE_ID = "agent-play-preview-session-profile-styles";

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.preview-session-profile-wrap {
  position: relative;
  z-index: auto;
}
.preview-session-profile-toggle {
  pointer-events: auto;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
}
.preview-session-profile-toggle:hover {
  background: rgba(30, 41, 59, 0.95);
}
.preview-session-profile-panel {
  display: none;
  margin-top: 8px;
  padding: 12px;
  width: 220px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.preview-session-profile-panel--open {
  display: block;
}
.preview-session-profile-row {
  margin-bottom: 10px;
}
.preview-session-profile-row label {
  display: block;
  margin-bottom: 4px;
  color: #cbd5e1;
  font-size: 11px;
}
.preview-session-profile-row select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(30, 41, 59, 0.95);
  color: #e2e8f0;
  font-size: 12px;
}
`;
  document.head.append(s);
}

export function createPreviewSessionProfilePanel(options: {
  onProfileApplied: () => void;
}): HTMLElement {
  ensureStyles();
  const wrap = document.createElement("div");
  wrap.className =
    "preview-chat-settings-wrap preview-chat-settings-wrap--toolbar preview-session-profile-wrap";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-session-profile-toggle";
  toggle.textContent = "You";

  const panel = document.createElement("div");
  panel.className = "preview-session-profile-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Your avatar and session");

  const mkSelect = <T extends string>(
    label: string,
    values: readonly T[],
    current: T,
    onChange: (v: T) => void
  ): HTMLElement => {
    const row = document.createElement("div");
    row.className = "preview-session-profile-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    for (const v of values) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      if (v === current) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => {
      onChange(sel.value as T);
    });
    row.append(lab, sel);
    return row;
  };

  const avatarValues: readonly ProfileAvatarPresetId[] = [
    "default",
    "ember",
    "forest",
  ];
  const genderValues: readonly ProfileGender[] = [
    "unspecified",
    "feminine",
    "masculine",
    "neutral",
  ];

  const sync = (): void => {
    const s = getPreviewViewSettings();
    panel.replaceChildren(
      mkSelect("Avatar", avatarValues, s.profileAvatarPresetId, (v) => {
        setPreviewViewSettings({ profileAvatarPresetId: v });
        options.onProfileApplied();
      }),
      mkSelect("Gender", genderValues, s.profileGender, (v) => {
        setPreviewViewSettings({ profileGender: v });
        options.onProfileApplied();
      })
    );
  };

  sync();
  toggle.addEventListener("click", () => {
    sync();
    panel.classList.toggle("preview-session-profile-panel--open");
  });

  wrap.append(toggle, panel);
  return wrap;
}
