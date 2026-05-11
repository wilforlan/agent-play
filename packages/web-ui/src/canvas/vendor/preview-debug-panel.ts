/**
 * @module @agent-play/play-ui/preview-debug-panel
 * preview debug panel — preview canvas module (Pixi + DOM).
 */
import type { PreviewViewSettings } from "./preview-view-settings.js";

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
  primaryAmenity?: string;
  amenities?: readonly string[];
};

export type PreviewDebugZoneRow = {
  id: string;
  streetId: string;
  streetLabel: string;
  primaryGroup: "agent" | "space" | "mcp";
  occupantCount: number;
};

type OccupancyDebugPick = Pick<
  PreviewViewSettings,
  "debugOccupancyQuartiles" | "debugOccupancyFreeGrids"
>;

export function createPreviewDebugPanel(options: {
  getSnapshot: () => {
    agents: readonly PreviewDebugAgentRow[];
    structures: readonly PreviewDebugStructureRow[];
    zones?: readonly PreviewDebugZoneRow[];
  };
  occupancyDebug?: {
    getSettings: () => OccupancyDebugPick;
    setSettings: (partial: Partial<OccupancyDebugPick>) => void;
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

  const agentsStructuresEl = document.createElement("div");
  agentsStructuresEl.className = "preview-debug-panel__agents-structures";
  body.appendChild(agentsStructuresEl);

  let quartileInput: HTMLInputElement | null = null;
  let freeGridsInput: HTMLInputElement | null = null;

  if (options.occupancyDebug !== undefined) {
    const occ = document.createElement("div");
    occ.className = "preview-debug-panel__occupancy";
    const oh = document.createElement("h4");
    oh.textContent = "Zones (street-named)";
    occ.appendChild(oh);

    const rowQuart = document.createElement("label");
    rowQuart.className = "preview-debug-panel__occupancy-row";
    quartileInput = document.createElement("input");
    quartileInput.type = "checkbox";
    quartileInput.addEventListener("change", () => {
      if (quartileInput !== null) {
        options.occupancyDebug?.setSettings({
          debugOccupancyQuartiles: quartileInput.checked,
        });
      }
    });
    const sq = document.createElement("span");
    sq.textContent =
      "Show world layout zones (agent strip · space strip · MCP strip)";
    rowQuart.append(quartileInput, sq);
    occ.appendChild(rowQuart);

    const rowFree = document.createElement("label");
    rowFree.className = "preview-debug-panel__occupancy-row";
    freeGridsInput = document.createElement("input");
    freeGridsInput.type = "checkbox";
    freeGridsInput.addEventListener("change", () => {
      if (freeGridsInput !== null) {
        options.occupancyDebug?.setSettings({
          debugOccupancyFreeGrids: freeGridsInput.checked,
        });
      }
    });
    const sf = document.createElement("span");
    sf.textContent =
      "Show free grids (green agent zone · cyan space zone)";
    rowFree.append(freeGridsInput, sf);
    occ.appendChild(rowFree);

    body.appendChild(occ);
  }

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
    const { agents, structures, zones } = options.getSnapshot();
    const esc = (s: string): string =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    let html = "";
    if (zones !== undefined && zones.length > 0) {
      html += '<h4>Streets</h4><ul class="preview-debug-panel__streets">';
      for (const z of zones) {
        html += `<li><strong>${esc(z.streetLabel)}</strong> <code>${esc(z.primaryGroup)}</code><br/>occupants: ${String(z.occupantCount)}</li>`;
      }
      html += "</ul>";
    }
    html += "<h4>Agents</h4><ul>";
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
      const amen =
        s.primaryAmenity !== undefined && s.primaryAmenity.length > 0
          ? ` primary=${esc(s.primaryAmenity)}`
          : "";
      const amens =
        s.amenities !== undefined && s.amenities.length > 0
          ? ` amenities=${esc(s.amenities.join(","))}`
          : "";
      html += `<li><strong>${esc(s.kind)}</strong> ${esc(s.id)}<br/>(${s.x}, ${s.y})${tool}${pid}${amen}${amens}</li>`;
    }
    html += "</ul>";
    agentsStructuresEl.innerHTML = html;

    if (options.occupancyDebug !== undefined) {
      const os = options.occupancyDebug.getSettings();
      if (quartileInput !== null) {
        quartileInput.checked = os.debugOccupancyQuartiles;
      }
      if (freeGridsInput !== null) {
        freeGridsInput.checked = os.debugOccupancyFreeGrids;
      }
    }
  };

  update();
  syncCompanionLayout();
  return { element: el, update, syncCompanionLayout };
}
