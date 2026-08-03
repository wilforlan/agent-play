/**
 * @module @agent-play/play-ui/preview-agent-chat-overlays
 * preview agent chat overlays — preview canvas module (Pixi + DOM).
 */
import { createChatBubbleElement, ensurePreviewChatStyles } from "./preview-chat-panel.js";
import { getChatLogLinesForAgent } from "./preview-chat-log.js";
import {
  applyAgentChatDisplayToLayer,
  getAgentChatDisplaySettings,
} from "./preview-chat-settings.js";
import type { AssistToolDef } from "./preview-assist-ui.js";

const AGENT_STYLE_ID = "agent-play-preview-agent-chat-overlay-styles";

function ensureAgentChatOverlayStyles(): void {
  if (document.getElementById(AGENT_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = AGENT_STYLE_ID;
  s.textContent = `
.preview-agent-chat-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.preview-agent-chat-card {
  position: absolute;
  box-sizing: border-box;
  width: var(--agent-chat-panel-w, 280px);
  max-width: calc(100% - 12px);
  pointer-events: auto;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(248, 250, 252, 0.97);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
  visibility: hidden;
}
.preview-agent-chat-scroll {
  max-height: var(--agent-chat-scroll-max, 220px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 8px;
  scroll-behavior: smooth;
  font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
  font-size: var(--agent-chat-font, 13px);
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: #0f172a;
}
.preview-agent-chat-card .preview-chat-meta {
  font-size: var(--agent-chat-meta, 10px);
  margin-bottom: 3px;
  letter-spacing: 0.03em;
  color: #475569;
  font-family: "Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
.preview-agent-chat-card .preview-chat-body {
  font-size: var(--agent-chat-font, 13px);
}
.preview-agent-chat-card .preview-chat-body p {
  margin: 0 0 0.2em 0;
}
.preview-agent-chat-card .preview-chat-body h1,
.preview-agent-chat-card .preview-chat-body h2,
.preview-agent-chat-card .preview-chat-body h3,
.preview-agent-chat-card .preview-chat-body h4 {
  margin: 0.2em 0 0.12em 0;
  font-size: calc(var(--agent-chat-font, 13px) * 1.05);
  font-weight: 700;
}
.preview-agent-chat-card .preview-chat-body ul,
.preview-agent-chat-card .preview-chat-body ol {
  margin: 0.15em 0;
  padding-left: 1em;
}
.preview-agent-chat-card .preview-chat-body pre {
  margin: 0.25em 0;
  padding: 6px 7px;
  font-size: var(--agent-chat-code, 11px);
  line-height: 1.35;
}
.preview-agent-chat-card .preview-chat-body code {
  font-size: var(--agent-chat-code, 11px);
  padding: 0.05em 0.25em;
}
.preview-agent-chat-card .preview-chat-body table {
  font-size: var(--agent-chat-code, 11px);
  margin: 0.25em 0;
}
.preview-agent-chat-card .preview-chat-bubble {
  margin-bottom: 5px;
  padding: 6px 8px;
}
.preview-agent-chat-scroll::-webkit-scrollbar {
  width: 5px;
}
.preview-agent-chat-scroll::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.45);
  border-radius: 6px;
}
.preview-agent-chat-scroll::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.9);
  border-radius: 6px;
}
`;
  document.head.append(s);
}

type CardEntry = {
  card: HTMLElement;
  scroll: HTMLElement;
};

export type AgentChatOverlaySnapshot = {
  agents: ReadonlyArray<{
    agentId: string;
    assistTools?: readonly AssistToolDef[];
  }>;
};

export function createPreviewAgentChatOverlays(): {
  root: HTMLElement;
  syncAgentIds: (ids: readonly string[]) => void;
  refreshPlayer: (agentId: string) => void;
  refreshAll: () => void;
  setLayout: (agentId: string, left: number, top: number) => void;
  applyDisplaySettings: () => void;
  setAssistSnapshot: (snapshot: AgentChatOverlaySnapshot) => void;
  setProximityFocus: (agentId: string | null) => void;
} {
  ensurePreviewChatStyles();
  ensureAgentChatOverlayStyles();

  const layer = document.createElement("div");
  layer.className = "preview-agent-chat-layer";
  applyAgentChatDisplayToLayer(layer, getAgentChatDisplaySettings());

  let proximityFocusAgentId: string | null = null;
  const byId = new Map<string, CardEntry>();
  const setAssistSnapshot = (snapshot: AgentChatOverlaySnapshot): void => {
    void snapshot;
  };

  const applyCardVisibility = (agentId: string): void => {
    const entry = byId.get(agentId);
    if (entry === undefined) return;
    const rows = getChatLogLinesForAgent(agentId);
    if (rows.length === 0) {
      entry.card.style.visibility = "hidden";
      return;
    }
    const visible =
      proximityFocusAgentId !== null && agentId === proximityFocusAgentId;
    entry.card.style.visibility = visible ? "visible" : "hidden";
  };

  const syncAgentIds = (ids: readonly string[]): void => {
    const want = new Set(ids);
    for (const id of byId.keys()) {
      if (!want.has(id)) {
        const entry = byId.get(id);
        if (entry !== undefined) {
          layer.removeChild(entry.card);
        }
        byId.delete(id);
      }
    }
    for (const id of ids) {
      if (byId.has(id)) continue;
      const card = document.createElement("div");
      card.className = "preview-agent-chat-card";
      card.setAttribute("role", "region");
      const scroll = document.createElement("div");
      scroll.className = "preview-agent-chat-scroll";
      card.appendChild(scroll);
      layer.appendChild(card);
      byId.set(id, { card, scroll });
    }
  };

  const refreshPlayer = (agentId: string): void => {
    const entry = byId.get(agentId);
    if (entry === undefined) return;
    const rows = getChatLogLinesForAgent(agentId);
    if (rows.length === 0) {
      entry.scroll.replaceChildren();
      entry.card.style.visibility = "hidden";
      return;
    }
    const label =
      rows[0]?.playerName !== undefined && rows[0].playerName.length > 0
        ? rows[0].playerName
        : agentId;
    entry.card.setAttribute("aria-label", `Chat for ${label}`);
    entry.scroll.replaceChildren();
    for (const line of rows) {
      entry.scroll.append(createChatBubbleElement(line));
    }
    entry.scroll.scrollTop = entry.scroll.scrollHeight;
    applyCardVisibility(agentId);
  };

  const refreshAll = (): void => {
    for (const id of byId.keys()) {
      refreshPlayer(id);
    }
  };

  const setLayout = (agentId: string, left: number, top: number): void => {
    const entry = byId.get(agentId);
    if (entry === undefined) return;
    entry.card.style.left = `${left}px`;
    entry.card.style.top = `${top}px`;
  };

  const applyDisplaySettings = (): void => {
    applyAgentChatDisplayToLayer(layer, getAgentChatDisplaySettings());
  };

  const setProximityFocus = (agentId: string | null): void => {
    proximityFocusAgentId = agentId;
    for (const id of byId.keys()) {
      applyCardVisibility(id);
    }
  };

  return {
    root: layer,
    syncAgentIds,
    refreshPlayer,
    refreshAll,
    setLayout,
    applyDisplaySettings,
    setAssistSnapshot,
    setProximityFocus,
  };
}
