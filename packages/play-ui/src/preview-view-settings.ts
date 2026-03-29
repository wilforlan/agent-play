import type { SceneThemeId } from "./scene-registry.js";
import { listSceneThemeIds } from "./scene-registry.js";

const STORAGE_KEY = "agent-play-preview-view-settings-v2";

export type ProfileAvatarPresetId = "default" | "ember" | "forest";

export type ProfileGender = "unspecified" | "feminine" | "masculine" | "neutral";

export type PreviewViewSettings = {
  themeId: SceneThemeId;
  showChatUi: boolean;
  debugMode: boolean;
  joystickEnabled: boolean;
  profileAvatarPresetId: ProfileAvatarPresetId;
  profileGender: ProfileGender;
};

function defaultDebugModeForHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]"
  );
}

function isProfileAvatarPresetId(v: string): v is ProfileAvatarPresetId {
  return v === "default" || v === "ember" || v === "forest";
}

function isProfileGender(v: string): v is ProfileGender {
  return (
    v === "unspecified" ||
    v === "feminine" ||
    v === "masculine" ||
    v === "neutral"
  );
}

export function getDefaultViewSettings(): PreviewViewSettings {
  return {
    themeId: "park",
    showChatUi: true,
    debugMode: defaultDebugModeForHost(),
    joystickEnabled: true,
    profileAvatarPresetId: "default",
    profileGender: "unspecified",
  };
}

function isSceneThemeId(v: string): v is SceneThemeId {
  return (listSceneThemeIds() as string[]).includes(v);
}

function parseStored(raw: string | null): Partial<PreviewViewSettings> | null {
  if (raw === null || raw.length === 0) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v === null || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const out: Partial<PreviewViewSettings> = {};
    if (typeof o.themeId === "string" && isSceneThemeId(o.themeId)) {
      out.themeId = o.themeId;
    }
    if (typeof o.showChatUi === "boolean") {
      out.showChatUi = o.showChatUi;
    }
    if (typeof o.debugMode === "boolean") {
      out.debugMode = o.debugMode;
    }
    if (typeof o.joystickEnabled === "boolean") {
      out.joystickEnabled = o.joystickEnabled;
    }
    if (
      typeof o.profileAvatarPresetId === "string" &&
      isProfileAvatarPresetId(o.profileAvatarPresetId)
    ) {
      out.profileAvatarPresetId = o.profileAvatarPresetId;
    }
    if (typeof o.profileGender === "string" && isProfileGender(o.profileGender)) {
      out.profileGender = o.profileGender;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

let current: PreviewViewSettings = getDefaultViewSettings();

function sanitize(s: PreviewViewSettings): PreviewViewSettings {
  const themeId = isSceneThemeId(s.themeId)
    ? s.themeId
    : getDefaultViewSettings().themeId;
  const profileAvatarPresetId = isProfileAvatarPresetId(s.profileAvatarPresetId)
    ? s.profileAvatarPresetId
    : getDefaultViewSettings().profileAvatarPresetId;
  const profileGender = isProfileGender(s.profileGender)
    ? s.profileGender
    : getDefaultViewSettings().profileGender;
  return {
    themeId,
    showChatUi: s.showChatUi,
    debugMode: s.debugMode,
    joystickEnabled: s.joystickEnabled,
    profileAvatarPresetId,
    profileGender,
  };
}

export function loadPreviewViewSettings(): PreviewViewSettings {
  const partial = parseStored(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null
  );
  const merged: PreviewViewSettings = {
    ...getDefaultViewSettings(),
    ...partial,
  };
  current = sanitize(merged);
  return { ...current };
}

export function persistPreviewViewSettings(s: PreviewViewSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getPreviewViewSettings(): PreviewViewSettings {
  return { ...current };
}

export function setPreviewViewSettings(
  next: Partial<PreviewViewSettings>
): PreviewViewSettings {
  current = sanitize({
    ...current,
    ...next,
  });
  persistPreviewViewSettings(current);
  return { ...current };
}

export function resetPreviewViewSettings(): PreviewViewSettings {
  current = sanitize(getDefaultViewSettings());
  persistPreviewViewSettings(current);
  return { ...current };
}

if (typeof localStorage !== "undefined") {
  loadPreviewViewSettings();
}
