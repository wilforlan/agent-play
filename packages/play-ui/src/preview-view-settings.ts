/**
 * @module @agent-play/play-ui/preview-view-settings
 * preview view settings — preview canvas module (Pixi + DOM).
 */
import type { SceneThemeId } from "./scene-registry.js";
import { listSceneThemeIds } from "./scene-registry.js";

const STORAGE_KEY = "agent-play-preview-view-settings-v2";
const DEEP_LOGS_OVERRIDE_STORAGE_KEY = "agent-play-deep-logs";

export type ProfileAvatarPresetId = "default" | "ember" | "forest";

export type ProfileGender = "unspecified" | "feminine" | "masculine" | "neutral";

export const PREVIEW_LANGUAGE_OPTIONS = [
  "English",
  "Yoruba",
  "Igbo",
  "Hausa",
  "French",
  "Spanish",
  "Portuguese",
  "German",
  "Italian",
  "Arabic",
  "Swahili",
  "Mandarin Chinese",
  "Hindi",
  "Japanese",
] as const;

export type PreviewLanguage = (typeof PREVIEW_LANGUAGE_OPTIONS)[number];

export type PreviewViewSettings = {
  themeId: SceneThemeId;
  showChatUi: boolean;
  debugMode: boolean;
  joystickEnabled: boolean;
  p2aEnabled: boolean;
  deepLogsEnabled: boolean;
  profileAvatarPresetId: ProfileAvatarPresetId;
  profileGender: ProfileGender;
  language: PreviewLanguage;
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

function defaultDeepLogsForHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function parseBooleanString(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (v === "on" || v === "true" || v === "1") return true;
  if (v === "off" || v === "false" || v === "0") return false;
  return undefined;
}

function deepLogsFromQueryParam(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("deepLogs");
  if (raw === null) return undefined;
  return parseBooleanString(raw);
}

function deepLogsFromStorage(): boolean | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(DEEP_LOGS_OVERRIDE_STORAGE_KEY);
  if (raw === null || raw.length === 0) return undefined;
  return parseBooleanString(raw);
}

function resolveDeepLogsOverride(): boolean | undefined {
  const byQuery = deepLogsFromQueryParam();
  if (byQuery !== undefined) return byQuery;
  return deepLogsFromStorage();
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

function isPreviewLanguage(v: string): v is PreviewLanguage {
  return (PREVIEW_LANGUAGE_OPTIONS as readonly string[]).includes(v);
}

export function getDefaultViewSettings(): PreviewViewSettings {
  return {
    themeId: "park",
    showChatUi: true,
    debugMode: defaultDebugModeForHost(),
    joystickEnabled: true,
    p2aEnabled: false,
    deepLogsEnabled: defaultDeepLogsForHost(),
    profileAvatarPresetId: "default",
    profileGender: "unspecified",
    language: "English",
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
    if (typeof o.p2aEnabled === "boolean") {
      out.p2aEnabled = o.p2aEnabled;
    }
    if (typeof o.deepLogsEnabled === "boolean") {
      out.deepLogsEnabled = o.deepLogsEnabled;
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
    if (typeof o.language === "string" && isPreviewLanguage(o.language)) {
      out.language = o.language;
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
  const language = isPreviewLanguage(s.language)
    ? s.language
    : getDefaultViewSettings().language;
  return {
    themeId,
    showChatUi: s.showChatUi,
    debugMode: s.debugMode,
    joystickEnabled: s.joystickEnabled,
    p2aEnabled: s.p2aEnabled,
    deepLogsEnabled: s.deepLogsEnabled,
    profileAvatarPresetId,
    profileGender,
    language,
  };
}

export function loadPreviewViewSettings(): PreviewViewSettings {
  const partial = parseStored(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null
  );
  const mergedBase: PreviewViewSettings = {
    ...getDefaultViewSettings(),
    ...partial,
  };
  const deepLogsOverride = resolveDeepLogsOverride();
  current = sanitize({
    ...mergedBase,
    ...(deepLogsOverride !== undefined
      ? { deepLogsEnabled: deepLogsOverride }
      : {}),
  });
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
