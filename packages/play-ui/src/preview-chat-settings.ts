/**
 * @module @agent-play/play-ui/preview-chat-settings
 * preview chat settings — preview canvas module (Pixi + DOM).
 */
const STORAGE_KEY = "agent-play-preview-chat-display-v1";

export type AgentChatDisplaySettings = {
  fontSizePx: number;
  panelWidthPx: number;
  scrollMaxHeightPx: number;
};

const DEFAULT_SETTINGS: AgentChatDisplaySettings = {
  fontSizePx: 8,
  panelWidthPx: 200,
  scrollMaxHeightPx: 148,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function layoutHeightFromScrollMax(scrollMaxHeightPx: number): number {
  return scrollMaxHeightPx + 16;
}

export function metaFontSizePx(bodyFontPx: number): number {
  return Math.max(4, Math.round(bodyFontPx * 0.75));
}

export function codeFontSizePx(bodyFontPx: number): number {
  return Math.max(4, Math.round(bodyFontPx * 0.85));
}

function parseStored(raw: string | null): Partial<AgentChatDisplaySettings> | null {
  if (raw === null || raw.length === 0) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v === null || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const out: Partial<AgentChatDisplaySettings> = {};
    if (typeof o.fontSizePx === "number" && Number.isFinite(o.fontSizePx)) {
      out.fontSizePx = o.fontSizePx;
    }
    if (typeof o.panelWidthPx === "number" && Number.isFinite(o.panelWidthPx)) {
      out.panelWidthPx = o.panelWidthPx;
    }
    if (
      typeof o.scrollMaxHeightPx === "number" &&
      Number.isFinite(o.scrollMaxHeightPx)
    ) {
      out.scrollMaxHeightPx = o.scrollMaxHeightPx;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

let current: AgentChatDisplaySettings = { ...DEFAULT_SETTINGS };

function sanitize(
  s: AgentChatDisplaySettings
): AgentChatDisplaySettings {
  return {
    fontSizePx: clamp(Math.round(s.fontSizePx), 5, 18),
    panelWidthPx: clamp(Math.round(s.panelWidthPx), 100, 400),
    scrollMaxHeightPx: clamp(Math.round(s.scrollMaxHeightPx), 24, 200),
  };
}

export function loadAgentChatDisplaySettings(): AgentChatDisplaySettings {
  const partial = parseStored(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null
  );
  const merged: AgentChatDisplaySettings = {
    ...DEFAULT_SETTINGS,
    ...partial,
  };
  current = sanitize(merged);
  return { ...current };
}

export function persistAgentChatDisplaySettings(s: AgentChatDisplaySettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getAgentChatDisplaySettings(): AgentChatDisplaySettings {
  return { ...current };
}

export function setAgentChatDisplaySettings(
  next: Partial<AgentChatDisplaySettings>
): AgentChatDisplaySettings {
  current = sanitize({
    ...current,
    ...next,
  });
  persistAgentChatDisplaySettings(current);
  return { ...current };
}

export function resetAgentChatDisplaySettings(): AgentChatDisplaySettings {
  current = sanitize({ ...DEFAULT_SETTINGS });
  persistAgentChatDisplaySettings(current);
  return { ...current };
}

export function applyAgentChatDisplayToLayer(
  layer: HTMLElement,
  settings: AgentChatDisplaySettings
): void {
  const s = sanitize(settings);
  const meta = metaFontSizePx(s.fontSizePx);
  const code = codeFontSizePx(s.fontSizePx);
  layer.style.setProperty("--agent-chat-font", `${s.fontSizePx}px`);
  layer.style.setProperty("--agent-chat-meta", `${meta}px`);
  layer.style.setProperty("--agent-chat-code", `${code}px`);
  layer.style.setProperty("--agent-chat-panel-w", `${s.panelWidthPx}px`);
  layer.style.setProperty("--agent-chat-scroll-max", `${s.scrollMaxHeightPx}px`);
}

if (typeof localStorage !== "undefined") {
  loadAgentChatDisplaySettings();
}
