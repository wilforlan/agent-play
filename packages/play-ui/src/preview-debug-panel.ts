/**
 * @module @agent-play/play-ui/preview-debug-panel
 * preview debug panel — preview canvas module (Pixi + DOM).
 */
export type PreviewDebugAgentRow = {
  playerId: string;
  name: string;
  worldX: number;
  worldY: number;
};

export type PreviewDebugStructureRow = {
  id: string;
  kind: string;
  x: number;
  y: number;
  toolName?: string;
  playerId?: string;
};

export function createPreviewDebugPanel(options: {
  getSnapshot: () => {
    agents: readonly PreviewDebugAgentRow[];
    structures: readonly PreviewDebugStructureRow[];
  };
}): {
  element: HTMLElement;
  update: () => void;
  syncCompanionLayout: () => void;
} {
  const el = document.createElement("div");
  el.className = "preview-debug-panel";
  el.setAttribute("role", "complementary");
  el.setAttribute("aria-label", "World debug coordinates");

  const title = document.createElement("div");
  title.className = "preview-debug-panel__title";
  title.textContent = "Debug";
  el.appendChild(title);

  const body = document.createElement("div");
  body.className = "preview-debug-panel__body";
  el.appendChild(body);

  const syncCompanionLayout = (): void => {
    const mount = el.parentElement;
    const messagesHidden =
      mount?.classList.contains("preview-debug-mount--messages-hidden") === true;
    if (!messagesHidden) {
      title.removeAttribute("role");
      title.removeAttribute("tabindex");
      title.removeAttribute("aria-expanded");
      return;
    }
    title.setAttribute("role", "button");
    title.tabIndex = 0;
    title.setAttribute(
      "aria-expanded",
      el.classList.contains("preview-debug-panel--expanded") ? "true" : "false"
    );
  };

  const toggleExpandedFromTitle = (): void => {
    const mount = el.parentElement;
    if (
      mount === null ||
      !mount.classList.contains("preview-debug-mount--messages-hidden")
    ) {
      return;
    }
    el.classList.toggle("preview-debug-panel--expanded");
    syncCompanionLayout();
  };

  title.addEventListener("click", () => {
    toggleExpandedFromTitle();
  });
  title.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    toggleExpandedFromTitle();
  });

  const update = (): void => {
    const { agents, structures } = options.getSnapshot();
    const esc = (s: string): string =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    let html = "<h4>Agents</h4><ul>";
    for (const a of agents) {
      html += `<li><strong>${esc(a.name)}</strong> <code>${esc(a.playerId)}</code><br/>world (${a.worldX.toFixed(2)}, ${a.worldY.toFixed(2)})</li>`;
    }
    html += "</ul><h4>Structures</h4><ul>";
    for (const s of structures) {
      const tool =
        s.toolName !== undefined && s.toolName.length > 0
          ? ` tool=${esc(s.toolName)}`
          : "";
      const pid =
        s.playerId !== undefined && s.playerId.length > 0
          ? ` player=${esc(s.playerId)}`
          : "";
      html += `<li><strong>${esc(s.kind)}</strong> ${esc(s.id)}<br/>(${s.x}, ${s.y})${tool}${pid}</li>`;
    }
    html += "</ul>";
    body.innerHTML = html;
  };

  update();
  syncCompanionLayout();
  return { element: el, update, syncCompanionLayout };
}
