import { createChatBubbleElement, ensurePreviewChatStyles } from "./preview-chat-panel.js";
import { getChatLogLinesForPlayer } from "./preview-chat-log.js";
import {
  applyAgentChatDisplayToLayer,
  getAgentChatDisplaySettings,
} from "./preview-chat-settings.js";
import {
  mountAssistPanel,
  type AssistToolDef,
} from "./preview-assist-ui.js";

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
  width: var(--agent-chat-panel-w, 200px);
  max-width: calc(100% - 12px);
  pointer-events: auto;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(248, 250, 252, 0.97);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
  visibility: hidden;
}
.preview-agent-chat-scroll {
  max-height: var(--agent-chat-scroll-max, 148px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3px 5px;
  scroll-behavior: smooth;
  font-family: "Cinzel", "Palatino Linotype", Palatino, "Times New Roman", serif;
  font-size: var(--agent-chat-font, 8px);
  line-height: 1.35;
  color: #0f172a;
}
.preview-agent-chat-card .preview-chat-meta {
  font-size: var(--agent-chat-meta, 6px);
  margin-bottom: 2px;
  letter-spacing: 0.04em;
}
.preview-agent-chat-card .preview-chat-body {
  font-size: var(--agent-chat-font, 8px);
}
.preview-agent-chat-card .preview-chat-body p {
  margin: 0 0 0.2em 0;
}
.preview-agent-chat-card .preview-chat-body h1,
.preview-agent-chat-card .preview-chat-body h2,
.preview-agent-chat-card .preview-chat-body h3,
.preview-agent-chat-card .preview-chat-body h4 {
  margin: 0.15em 0 0.1em 0;
  font-size: var(--agent-chat-font, 8px);
}
.preview-agent-chat-card .preview-chat-body ul,
.preview-agent-chat-card .preview-chat-body ol {
  margin: 0.15em 0;
  padding-left: 1em;
}
.preview-agent-chat-card .preview-chat-body pre {
  margin: 0.2em 0;
  padding: 3px 4px;
  font-size: var(--agent-chat-code, 7px);
  line-height: 1.3;
}
.preview-agent-chat-card .preview-chat-body code {
  font-size: var(--agent-chat-code, 7px);
  padding: 0.05em 0.2em;
}
.preview-agent-chat-card .preview-chat-body table {
  font-size: var(--agent-chat-code, 7px);
  margin: 0.2em 0;
}
.preview-agent-chat-card .preview-chat-bubble {
  margin-bottom: 3px;
  padding: 3px 5px;
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
  players: ReadonlyArray<{
    playerId: string;
    assistTools?: readonly AssistToolDef[];
  }>;
};

export function createPreviewAgentChatOverlays(options: {
  getSid: () => string | null;
  apiBase: string;
  reloadSnapshot: () => void | Promise<void>;
}): {
  root: HTMLElement;
  syncPlayerIds: (ids: readonly string[]) => void;
  refreshPlayer: (playerId: string) => void;
  refreshAll: () => void;
  setLayout: (playerId: string, left: number, top: number) => void;
  applyDisplaySettings: () => void;
  setAssistSnapshot: (snapshot: AgentChatOverlaySnapshot) => void;
} {
  ensurePreviewChatStyles();
  ensureAgentChatOverlayStyles();

  const layer = document.createElement("div");
  layer.className = "preview-agent-chat-layer";
  applyAgentChatDisplayToLayer(layer, getAgentChatDisplaySettings());

  const byId = new Map<string, CardEntry>();
  const assistById = new Map<
    string,
    ReturnType<typeof mountAssistPanel>
  >();
  const assistCountById = new Map<string, number>();

  const setAssistSnapshot = (snapshot: AgentChatOverlaySnapshot): void => {
    assistCountById.clear();
    for (const p of snapshot.players) {
      const n = p.assistTools?.length ?? 0;
      assistCountById.set(p.playerId, n);
      const h = assistById.get(p.playerId);
      if (h !== undefined) {
        h.setTools(p.assistTools ?? []);
      }
    }
  };

  const syncPlayerIds = (ids: readonly string[]): void => {
    const want = new Set(ids);
    for (const id of byId.keys()) {
      if (!want.has(id)) {
        const entry = byId.get(id);
        if (entry !== undefined) {
          layer.removeChild(entry.card);
        }
        byId.delete(id);
        assistById.get(id)?.destroy();
        assistById.delete(id);
        assistCountById.delete(id);
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
      const assist = mountAssistPanel({
        card,
        playerId: id,
        getSid: options.getSid,
        apiBase: options.apiBase,
        reloadSnapshot: options.reloadSnapshot,
      });
      assistById.set(id, assist);
      assist.setTools([]);
    }
  };

  const refreshPlayer = (playerId: string): void => {
    const entry = byId.get(playerId);
    if (entry === undefined) return;
    const rows = getChatLogLinesForPlayer(playerId);
    const assistN = assistCountById.get(playerId) ?? 0;
    if (rows.length === 0 && assistN === 0) {
      entry.scroll.replaceChildren();
      entry.card.style.visibility = "hidden";
      return;
    }
    const label =
      rows[0]?.playerName !== undefined && rows[0].playerName.length > 0
        ? rows[0].playerName
        : playerId;
    entry.card.setAttribute("aria-label", `Chat for ${label}`);
    entry.card.style.visibility = "visible";
    entry.scroll.replaceChildren();
    for (const line of rows) {
      entry.scroll.append(createChatBubbleElement(line));
    }
    entry.scroll.scrollTop = entry.scroll.scrollHeight;
  };

  const refreshAll = (): void => {
    for (const id of byId.keys()) {
      refreshPlayer(id);
    }
  };

  const setLayout = (playerId: string, left: number, top: number): void => {
    const entry = byId.get(playerId);
    if (entry === undefined) return;
    entry.card.style.left = `${left}px`;
    entry.card.style.top = `${top}px`;
  };

  const applyDisplaySettings = (): void => {
    applyAgentChatDisplayToLayer(layer, getAgentChatDisplaySettings());
  };

  return {
    root: layer,
    syncPlayerIds,
    refreshPlayer,
    refreshAll,
    setLayout,
    applyDisplaySettings,
    setAssistSnapshot,
  };
}
