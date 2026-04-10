/**
 * @packageDocumentation
 * **@agent-play/play-ui** watch canvas (`main.ts`): single-page Pixi.js scene for the multiverse preview.
 *
 * **Lifecycle**
 * 1. {@link bootstrap} (exported) runs on load: reads `sid`, {@link loadSnapshot}, {@link connectSse}, starts Pixi {@link createPixiPreview}.
 * 2. **Tick loop** — {@link onTick} advances avatar motion; {@link onFrame} runs after physics.
 * 3. **SSE** — `world:journey`, `world:interaction`, etc. update {@link applyJourneyUpdate} and chat.
 *
 * **Major collaborators (imported)**
 * - `@agent-play/sdk/browser` — {@link clampWorldPosition} for joystick (no Node-only SDK entry).
 * - `./pixi-multiverse` — WebGL app wrapper.
 * - `./structure-art` — vector drawings for home, tools, vendor stalls, MCP stores.
 * - `./preview-*` — DOM chat, settings, debug UI layered over the canvas.
 *
 * **Module state** — File-scope `let` blocks hold map bounds, palette, agent/structure node maps, SSE handle, and Pixi handles (see comments above each cluster).
 */
import { Color, Container, Graphics, Text } from "pixi.js";
import { nextAvatarMotion } from "./avatar-anim.js";
import { buildCrowdLayer } from "./crowd-draw.js";
import { layoutCrowdClusters } from "./crowd-layout.js";
import { drawPlatformHero, type HeroPaletteVariant } from "./hero-puppet.js";
import {
  cssColorToPixi,
  mergeMultiversePalette,
  mcpStorePalette,
  vendorStallPalette,
  type MultiversePalette,
} from "./multiverse-engine.js";
import {
  agentChatHorizontalNudgePx,
  computeAgentChatPanelPosition,
} from "./agent-chat-panel-position.js";
import {
  clampWorldPosition,
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
  type AgentPlaySnapshot,
  type WorldBounds,
} from "@agent-play/sdk/browser";
import {
  appendChatLogLine,
  resetChatLogFromSnapshot,
} from "./preview-chat-log.js";
import {
  ensurePreviewSessionId,
  getPreviewSessionIdSync,
} from "./preview-session-id.js";
import { ensureHumanNodeOnboarding } from "./preview-human-onboarding.js";
import {
  clearHumanCredentials,
  getMainNodeIdForIntercom,
} from "./preview-human-credentials.js";
import { createPreviewAgentChatOverlays } from "./preview-agent-chat-overlays.js";
import { ensurePreviewChatStyles } from "./preview-chat-panel.js";
import { createPreviewChatSettingsPanel } from "./preview-chat-settings-panel.js";
import { createPreviewSessionInteractionPanel } from "./preview-session-interaction-panel.js";
import { createPreviewSessionProfilePanel } from "./preview-session-profile-panel.js";
import { createPreviewSessionToolsPanel } from "./preview-session-tools-panel.js";
import {
  getAgentChatDisplaySettings,
  layoutHeightFromScrollMax,
} from "./preview-chat-settings.js";
import {
  createPreviewDebugJoystick,
  getJoystickVector,
  JOYSTICK_DEFLECT_EPS,
  setJoystickVectorZero,
  shouldClampWorldPositionWhenJoystickDriving,
  shouldClearPrimaryWaypointsWhileJoystickIdle,
} from "./preview-debug-joystick.js";
import { createPreviewDebugPanel } from "./preview-debug-panel.js";
import { createPixiPreview, type PixiPreviewHandle } from "./pixi-multiverse.js";
import { attachMobileSidePanelControls } from "./preview-mobile-side-panels.js";
import {
  createPreviewBottomBar,
  ensurePreviewLayoutStyles,
} from "./preview-settings-toolbar.js";
import { getPreviewViewSettings } from "./preview-view-settings.js";
import { ENABLE_CROWD_LAYER, getActiveSceneTheme } from "./scene-theme.js";
import {
  drawHomeStructure,
  drawMcpStore,
  drawToolPad,
  drawVendorStall,
} from "./structure-art.js";
import type { AvatarFacing } from "./avatar-anim.js";
import {
  DEFAULT_PROXIMITY_RADIUS,
  findNearestProximityPartner,
  proximityKeyToAction,
  type ProximityActionKind,
} from "./proximity-interaction.js";

const BASE =
  typeof process !== "undefined" &&
  typeof process.env?.NEXT_PUBLIC_AGENT_PLAY_BASE === "string"
    ? process.env.NEXT_PUBLIC_AGENT_PLAY_BASE.replace(/\/$/, "")
    : typeof import.meta !== "undefined" &&
        typeof import.meta.env?.BASE_URL === "string"
      ? import.meta.env.BASE_URL.replace(/\/$/, "") || ""
      : "";
const API_BASE =
  typeof process !== "undefined" &&
  typeof process.env?.NEXT_PUBLIC_PLAY_API_BASE === "string" &&
  process.env.NEXT_PUBLIC_PLAY_API_BASE.length > 0
    ? process.env.NEXT_PUBLIC_PLAY_API_BASE.replace(/\/$/, "")
    : typeof import.meta !== "undefined" &&
        typeof import.meta.env?.VITE_PLAY_API_BASE === "string" &&
        import.meta.env.VITE_PLAY_API_BASE.length > 0
      ? import.meta.env.VITE_PLAY_API_BASE.replace(/\/$/, "")
      : BASE;
const VIEW_W = 720;
const VIEW_H = 520;
const CELL = 48;
const ORIGIN_X = 24;
const WORLD_BOTTOM_MARGIN = 14;
const WORLD_INTERACTION_SSE = "world:interaction";
const WORLD_AGENT_SIGNAL_SSE = "world:agent_signal";
const WORLD_INTERCOM_SSE = "world:intercom";
const HUMAN_VIEWER_PLAYER_ID = "__human__";
const MAX_PLAYER_CHAIN_FETCH_STEPS = 102;
const HOME_STAND_EPS = 0.26;
const HOME_FRONT_OFFSET_WX = 0.16;
const HOME_FRONT_OFFSET_WY = 0.22;
const PREVIEW_AGENT_CHAT_MARGIN_PX = 6;
const PREVIEW_AGENT_CHAT_GAP_PX = 8;

/** Snapshot structure row (subset of server JSON). */
type Structure = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label?: string;
  toolName?: string;
  agentId?: string;
  playerId?: string;
};

type PathStep = {
  type: string;
  x?: number;
  y?: number;
  content?: string;
  toolName?: string;
};

type JourneyUpdate = {
  agentId: string;
  path: PathStep[];
  structures: Structure[];
};

type SnapshotInteraction = {
  role: string;
  text: string;
  at?: string;
  seq?: number;
};

type SnapshotAssistTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type AgentRow = {
  agentId: string;
  name: string;
  structures: Structure[];
  stationary?: boolean;
  lastUpdate?: JourneyUpdate;
  recentInteractions?: SnapshotInteraction[];
  assistTools?: SnapshotAssistTool[];
  onZone?: { zoneCount: number; flagged?: boolean; at: string };
  onYield?: { yieldCount: number; at: string };
};

type SnapshotAgentOccupant = {
  kind: "agent";
  agentId: string;
  name: string;
  x: number;
  y: number;
  stationary?: boolean;
  lastUpdate?: unknown;
  recentInteractions?: SnapshotInteraction[];
  assistTools?: SnapshotAssistTool[];
  onZone?: { zoneCount: number; flagged?: boolean; at: string };
  onYield?: { yieldCount: number; at: string };
};

type SnapshotMcpOccupant = {
  kind: "mcp";
  id: string;
  name: string;
  x: number;
  y: number;
  url?: string;
};

type WorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  occupants: (SnapshotAgentOccupant | SnapshotMcpOccupant)[];
};

type SnapshotMcpRegistration = {
  id: string;
  name: string;
  url?: string;
};

type Snapshot = {
  sid: string;
  worldMap: WorldMapJson;
  mcpServers?: SnapshotMcpRegistration[];
};

function mapOccupantLastUpdate(
  agentId: string,
  raw: unknown
): JourneyUpdate | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const rec = raw as { path?: unknown };
  if (!Array.isArray(rec.path)) return undefined;
  return {
    agentId,
    path: rec.path as PathStep[],
    structures: [],
  };
}

function listAgentRows(s: Snapshot): AgentRow[] {
  return s.worldMap.occupants
    .filter((o): o is SnapshotAgentOccupant => o.kind === "agent")
    .map((o) => ({
      agentId: o.agentId,
      name: o.name,
      structures: [],
      stationary: o.stationary,
      lastUpdate: mapOccupantLastUpdate(o.agentId, o.lastUpdate),
      recentInteractions: o.recentInteractions,
      assistTools: o.assistTools,
      onZone: o.onZone,
      onYield: o.onYield,
    }));
}

type AgentVisual = {
  root: Container;
  hero: Graphics;
  nameTag: Text;
};

type StructureVisual = {
  box: Graphics;
  caption: Text;
};

/**
 * Resolves the preview session id: sessionStorage (from prior bootstrap), then `?sid=` on the URL.
 * @remarks Must match {@link ensurePreviewSessionId} / {@link getPreviewSessionIdSync} so assist/chat RPCs see the same sid as snapshot loads.
 */
function getSid(): string | null {
  return getPreviewSessionIdSync();
}

let mapMinX = 0;
let mapMinY = 0;
let mapMaxX = 0;
let mapMaxY = 0;
let cellScale = CELL;
let worldOriginScreenY = VIEW_H - WORLD_BOTTOM_MARGIN - 8 * CELL;
let gridBounds: WorldMapJson["bounds"] | null = null;

/** Active theme colors; updated when theme changes. */
let palette: MultiversePalette = mergeMultiversePalette({});

/**
 * Stores grid bounds and recomputes scale/origin so the map fits the fixed view size.
 * @remarks **Callers:** {@link loadSnapshot}, theme rebuilds. **Callees:** none.
 */
function applyBounds(bounds: WorldMapJson["bounds"]): void {
  gridBounds = bounds;
  const pad = 1;
  const w = Math.max(1, bounds.maxX - bounds.minX + 2 * pad);
  const h = Math.max(1, bounds.maxY - bounds.minY + 2 * pad);
  const maxW = VIEW_W - ORIGIN_X * 2;
  const theme = getActiveSceneTheme();
  const grassTop = VIEW_H * theme.grassBandTopRatio;
  const minGridTop = grassTop + 12;
  const maxBottom = VIEW_H - WORLD_BOTTOM_MARGIN;
  const maxHSpace = Math.max(40, maxBottom - minGridTop);
  cellScale = Math.min(maxW / w, maxHSpace / h, 64);
  mapMinX = bounds.minX - pad;
  mapMinY = bounds.minY - pad;
  mapMaxX = bounds.maxX + pad;
  mapMaxY = bounds.maxY + pad;
  worldOriginScreenY = maxBottom - h * cellScale;
}

/**
 * Maps world grid coordinates to Pixi screen pixels (Y flipped so +y is “north” on screen).
 * @remarks **Callers:** drawing, {@link getAgentHeroAnchorScreen}, proximity. **Callees:** none.
 */
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (wx - mapMinX) * cellScale,
    y: worldOriginScreenY + (mapMaxY - wy) * cellScale,
  };
}

/**
 * @returns {@link WorldBounds} for {@link clampWorldPosition}, or `null` before first snapshot.
 * @remarks **Callers:** {@link setWaypoints}, {@link loadSnapshot}, joystick. **Callees:** none.
 */
function getWorldBoundsForClamp(): WorldBounds | null {
  if (gridBounds === null) return null;
  return { minX: mapMinX, minY: mapMinY, maxX: mapMaxX, maxY: mapMaxY };
}

const arrowKeys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let lastProximityPartnerId: string | null = null;
let proximityPromptEl: HTMLDivElement | null = null;
let proximityLegendEl: HTMLDivElement | null = null;

const playerWorldPos = new Map<string, { x: number; y: number }>();
const waypointQueues = new Map<string, Array<{ x: number; y: number }>>();
const lastTickWorldPos = new Map<string, { x: number; y: number }>();
const walkPhaseByPlayer = new Map<string, number>();
const facingByPlayer = new Map<string, AvatarFacing>();
const movingByPlayer = new Map<string, boolean>();

/** Latest RPC snapshot; drives rendering and chat. */
let snapshot: Snapshot | null = null;

/**
 * @returns `__human__` id when snapshot exists (viewer-controlled pawn), else `null`.
 * @remarks **Callers:** keyboard handlers. **Callees:** none.
 */
function getHumanPlayerId(): string | null {
  return snapshot === null ? null : HUMAN_VIEWER_PLAYER_ID;
}

/**
 * Updates arrow-key state for {@link onTick} human movement.
 * @remarks **Callers:** {@link onDocumentKeyDown}, {@link onDocumentKeyUp}. **Callees:** none.
 */
function setArrowKey(key: string, down: boolean): void {
  if (key === "ArrowUp") arrowKeys.up = down;
  else if (key === "ArrowDown") arrowKeys.down = down;
  else if (key === "ArrowLeft") arrowKeys.left = down;
  else if (key === "ArrowRight") arrowKeys.right = down;
}

/**
 * POSTs proximity intent (assist/chat/zone/yield) to the host.
 * @remarks **Callers:** {@link onDocumentKeyDown}. **Callees:** `fetch`.
 */
async function sendProximityAction(
  toAgentId: string,
  action: ProximityActionKind
): Promise<void> {
  const sid = getSid();
  if (sid === null) return;
  const fromPlayerId = getMainNodeIdForIntercom();
  if (fromPlayerId === null) return;
  const url = `${API_BASE}/proximity-action?sid=${encodeURIComponent(sid)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPlayerId,
        toPlayerId: toAgentId,
        action,
      }),
    });
    if (!res.ok) return;
  } catch {
    return;
  }
}

/**
 * Routes arrow keys to movement and letter keys to proximity when an agent partner is targeted.
 * @remarks **Callers:** `document` listener from {@link bootstrap}. **Callees:** {@link setArrowKey}, {@link sendProximityAction}.
 */
function onDocumentKeyDown(e: KeyboardEvent): void {
  const inField =
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target instanceof HTMLElement && e.target.isContentEditable);
  if (
    e.key === "ArrowUp" ||
    e.key === "ArrowDown" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight"
  ) {
    if (!inField && getHumanPlayerId() !== null) {
      e.preventDefault();
    }
    setArrowKey(e.key, true);
    return;
  }
  if (inField || e.repeat) return;
  const partner = registeredAgentPartnerForProximityOrNull(
    lastProximityPartnerId
  );
  if (partner === null || partner === HUMAN_VIEWER_PLAYER_ID) return;
  const act = proximityKeyToAction(e.key);
  if (act === null) return;
  e.preventDefault();
  if (act === "assist" || act === "chat") {
    sessionInteractionPanel?.setContext(partner);
    sessionInteractionPanel?.setMode(act);
    if (mobileSidePanelControls?.isMobileViewport() === true) {
      mobileSidePanelControls.openRightPanel();
    }
  }
  void sendProximityAction(partner, act);
}

/**
 * Releases arrow keys for human movement.
 * @remarks **Callers:** `document` listener. **Callees:** {@link setArrowKey}.
 */
function onDocumentKeyUp(e: KeyboardEvent): void {
  if (
    e.key === "ArrowUp" ||
    e.key === "ArrowDown" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight"
  ) {
    setArrowKey(e.key, false);
  }
}

let appStage: Container | null = null;
const structureLayer = new Container();
const gridGraphics = new Graphics();
const agentsLayer = new Container();
const worldLayer = new Container();

const structureNodes = new Map<string, StructureVisual>();
const agentNodes = new Map<string, AgentVisual>();

let refreshPreviewChat: () => void = () => {};

let agentChatOverlays: ReturnType<typeof createPreviewAgentChatOverlays> | null =
  null;
let sessionInteractionPanel:
  | ReturnType<typeof createPreviewSessionInteractionPanel>
  | null = null;
let mobileSidePanelControls:
  | ReturnType<typeof attachMobileSidePanelControls>
  | null = null;

let pixiHandle: PixiPreviewHandle | null = null;
let sceneRootContainer: Container | null = null;
let crowdLayerContainer: Container | null = null;
let debugPanelUpdate: (() => void) | null = null;
let debugMountEl: HTMLElement | null = null;
let joystickHandle: ReturnType<typeof createPreviewDebugJoystick> | null = null;
let previewBootstrapStarted = false;
let previewBootstrapLock: Promise<void> | null = null;

/**
 * Resolves a stable display name for chat labels (“You” for the human viewer).
 * @remarks **Callers:** chat overlays, {@link pushInteractionToChat}. **Callees:** none.
 */
function playerDisplayName(playerId: string): string {
  if (playerId === HUMAN_VIEWER_PLAYER_ID) return "You";
  if (snapshot === null) return playerId;
  return (
    listAgentRows(snapshot).find((p) => p.agentId === playerId)?.name ??
    playerId
  );
}

function registeredAgentPartnerForProximityOrNull(
  candidateId: string | null
): string | null {
  if (candidateId === null || snapshot === null) return null;
  const rows = listAgentRows(snapshot);
  return rows.some((r) => r.agentId === candidateId) ? candidateId : null;
}

/**
 * Appends one SSE interaction line and refreshes the DOM chat panel.
 * @remarks **Callers:** {@link connectSse}. **Callees:** {@link appendChatLogLine}, {@link playerDisplayName}, `refreshPreviewChat`.
 */
function pushInteractionToChat(
  agentId: string,
  role: string,
  text: string,
  seq?: number
): void {
  appendChatLogLine({
    agentId,
    playerName: playerDisplayName(agentId),
    role,
    text,
    seq,
  });
  refreshPreviewChat();
}

/**
 * Rebuilds chat state from a fresh snapshot (players + assist metadata).
 * @remarks **Callers:** {@link loadSnapshot}. **Callees:** {@link resetChatLogFromSnapshot}, overlays.
 */
function hydrateChatFromSnapshot(s: Snapshot): void {
  resetChatLogFromSnapshot(s);
  const rows = listAgentRows(s);
  agentChatOverlays?.syncAgentIds(rows.map((p) => p.agentId));
  agentChatOverlays?.setAssistSnapshot({
    agents: rows.map((p) => ({
      agentId: p.agentId,
      assistTools: p.assistTools,
    })),
  });
  sessionInteractionPanel?.setAgents(
    rows.map((p) => ({
      agentId: p.agentId,
      name: p.name,
      assistTools: p.assistTools,
    }))
  );
  sessionInteractionPanel?.refresh();
  refreshPreviewChat();
}

function collectStructuresForRender(s: Snapshot): Structure[] {
  const out: Structure[] = [];
  for (const o of s.worldMap.occupants) {
    if (o.kind !== "mcp") continue;
    out.push({
      id: `mcp:${o.id}`,
      kind: "tool",
      x: o.x,
      y: o.y,
      label: o.name,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function getPlayerHomeCell(
  playerId: string,
  s: Snapshot | null
): { x: number; y: number } | null {
  if (s === null) return null;
  const occ = s.worldMap.occupants.find(
    (o): o is SnapshotAgentOccupant =>
      o.kind === "agent" && o.agentId === playerId
  );
  if (occ === undefined) return null;
  return { x: occ.x, y: occ.y };
}

function getAgentHeroAnchorScreen(
  playerId: string,
  wpos: { x: number; y: number },
  box: number
): { cx: number; cy: number } {
  const home = getPlayerHomeCell(playerId, snapshot);
  let wx = wpos.x;
  let wy = wpos.y;
  if (
    home !== null &&
    Math.hypot(wpos.x - home.x, wpos.y - home.y) < HOME_STAND_EPS
  ) {
    wx += HOME_FRONT_OFFSET_WX;
    wy += HOME_FRONT_OFFSET_WY;
  }
  const { x: sx, y: sy } = worldToScreen(wx, wy);
  return { cx: sx + box * 0.3, cy: sy + box * 0.55 };
}

function setWaypoints(playerId: string, path: PathStep[]): void {
  const pts: Array<{ x: number; y: number }> = [];
  for (const step of path) {
    if (typeof step.x === "number" && typeof step.y === "number") {
      pts.push({ x: step.x, y: step.y });
    }
  }
  if (pts.length === 0) return;
  const wb = getWorldBoundsForClamp();
  const resolved =
    wb !== null
      ? pts.map((p) => clampWorldPosition(p, wb))
      : pts;
  waypointQueues.set(playerId, resolved);
}

function applyJourneyUpdate(u: JourneyUpdate): void {
  if (u.agentId === HUMAN_VIEWER_PLAYER_ID) return;
  if (snapshot === null) return;
  const row = listAgentRows(snapshot).find((p) => p.agentId === u.agentId);
  if (row !== undefined && row.stationary !== false) return;
  setWaypoints(u.agentId, u.path);
}

function ingestSnapshot(snap: Snapshot): void {
  snapshot = snap;
  const b = snapshot.worldMap.bounds;
  if (b !== undefined) applyBounds(b);
  else {
    mapMinX = 0;
    mapMinY = 0;
    mapMaxX = 0;
    mapMaxY = 0;
    cellScale = CELL;
    gridBounds = null;
    const theme = getActiveSceneTheme();
    const grassTop = VIEW_H * theme.grassBandTopRatio;
    const placeholderRows = 8;
    let y0 = VIEW_H - WORLD_BOTTOM_MARGIN - placeholderRows * cellScale;
    const minY0 = grassTop + 16;
    worldOriginScreenY = y0 < minY0 ? minY0 : y0;
  }
  const wbSpawn = getWorldBoundsForClamp();
  let humanSpawn = { x: 0, y: 0 };
  if (wbSpawn !== null) {
    humanSpawn = {
      x: (wbSpawn.minX + wbSpawn.maxX) / 2,
      y: (wbSpawn.minY + wbSpawn.maxY) / 2,
    };
  }
  for (const p of listAgentRows(snapshot)) {
    const home = getPlayerHomeCell(p.agentId, snapshot);
    const spawn =
      home !== null ? { x: home.x, y: home.y } : { x: 0, y: 0 };
    const clamped =
      wbSpawn !== null ? clampWorldPosition(spawn, wbSpawn) : spawn;
    playerWorldPos.set(p.agentId, clamped);
    waypointQueues.delete(p.agentId);
    if (p.stationary === false && p.lastUpdate !== undefined) {
      applyJourneyUpdate(p.lastUpdate);
    }
  }
  if (!playerWorldPos.has(HUMAN_VIEWER_PLAYER_ID)) {
    playerWorldPos.set(
      HUMAN_VIEWER_PLAYER_ID,
      wbSpawn !== null ? clampWorldPosition(humanSpawn, wbSpawn) : humanSpawn
    );
  } else if (wbSpawn !== null) {
    const cur = playerWorldPos.get(HUMAN_VIEWER_PLAYER_ID);
    if (cur !== undefined) {
      playerWorldPos.set(HUMAN_VIEWER_PLAYER_ID, clampWorldPosition(cur, wbSpawn));
    }
  }
  hydrateChatFromSnapshot(snapshot);
}

async function loadSnapshot(sid: string): Promise<void> {
  void sid;
  const res = await fetch(`${API_BASE}/sdk/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "getWorldSnapshot", payload: {} }),
  });
  if (!res.ok) return;
  const body = (await res.json()) as {
    snapshot?: Snapshot;
    error?: string;
  };
  if (typeof body.error === "string" || body.snapshot === undefined) return;
  const snap = body.snapshot;
  if (
    snap.worldMap === undefined ||
    !Array.isArray(snap.worldMap.occupants)
  ) {
    return;
  }
  ingestSnapshot(snap);
}

async function tryApplyPlayerChainNotify(data: unknown): Promise<boolean> {
  const notify = parsePlayerChainFanoutNotifyFromSsePayload(data);
  if (notify === undefined || notify.nodes.length === 0) {
    return false;
  }
  if (snapshot === null) {
    return false;
  }
  let next: AgentPlaySnapshot = snapshot as AgentPlaySnapshot;
  const ordered = sortNodeRefsForSerializedFetch(notify.nodes);
  const cap = Math.min(ordered.length, MAX_PLAYER_CHAIN_FETCH_STEPS);
  for (let i = 0; i < cap; i++) {
    const ref = ordered[i];
    if (ref === undefined) continue;
    const res = await fetch(`${API_BASE}/sdk/rpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "getPlayerChainNode",
        payload: { stableKey: ref.stableKey },
      }),
    });
    const body = (await res.json()) as { node?: unknown; error?: string };
    if (!res.ok || body.node === undefined) {
      return false;
    }
    try {
      const node = parsePlayerChainNodeRpcBody(body);
      next = mergeSnapshotWithPlayerChainNode(next, node);
    } catch {
      return false;
    }
  }
  ingestSnapshot(next as Snapshot);
  return true;
}

async function handleWorldMapSse(sid: string, raw: string): Promise<void> {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    void loadSnapshot(sid);
    return;
  }
  const merged = await tryApplyPlayerChainNotify(data);
  if (!merged) {
    void loadSnapshot(sid);
  }
}

function connectSse(sid: string): void {
  const es = new EventSource(
    `${API_BASE}/events?sid=${encodeURIComponent(sid)}`
  );
  es.addEventListener(WORLD_AGENT_SIGNAL_SSE, (ev) => {
    void handleWorldMapSse(sid, (ev as MessageEvent).data as string);
  });
  es.addEventListener("world:player_added", (ev) => {
    void handleWorldMapSse(sid, (ev as MessageEvent).data as string);
  });
  es.addEventListener(WORLD_INTERACTION_SSE, (ev) => {
    const data = JSON.parse((ev as MessageEvent).data) as {
      agentId?: string;
      playerId?: string;
      role: string;
      text: string;
      seq?: number;
    };
    const lineAgentId =
      typeof data.agentId === "string"
        ? data.agentId
        : typeof data.playerId === "string"
          ? data.playerId
          : "";
    if (lineAgentId.length === 0) return;
    pushInteractionToChat(lineAgentId, data.role, data.text, data.seq);
  });
  es.addEventListener(WORLD_INTERCOM_SSE, (ev) => {
    const raw = (ev as MessageEvent).data as string;
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return;
    }
    sessionInteractionPanel?.applyIntercomEvent(data);
  });
}

function moveToward(
  current: { x: number; y: number },
  target: { x: number; y: number },
  speed: number,
  dt: number
): { x: number; y: number } {
  const tw = target.x - current.x;
  const th = target.y - current.y;
  const len = Math.hypot(tw, th);
  if (len < 0.05) return { ...target };
  const step = Math.min(len, speed * dt);
  return {
    x: current.x + (tw / len) * step,
    y: current.y + (th / len) * step,
  };
}

function makeAgentVisual(): AgentVisual {
  const root = new Container();
  const hero = new Graphics({ roundPixels: true });
  const nameTag = new Text({
    text: "",
    style: {
      fontFamily: "ui-monospace, monospace",
      fontSize: 11,
      fontWeight: "600",
      fill: cssColorToPixi(palette.textMuted),
    },
  });
  root.addChild(hero);
  root.addChild(nameTag);
  return { root, hero, nameTag };
}

function syncStructureNodes(structs: Structure[]): void {
  const theme = getActiveSceneTheme();
  const alive = new Set(structs.map((s) => s.id));
  for (const id of structureNodes.keys()) {
    if (!alive.has(id)) {
      const n = structureNodes.get(id);
      if (n !== undefined) {
        structureLayer.removeChild(n.box);
        structureLayer.removeChild(n.caption);
        n.box.destroy();
        n.caption.destroy();
      }
      structureNodes.delete(id);
    }
  }
  const box = Math.max(16, Math.min(40, cellScale * 0.85));
  for (const st of structs) {
    let n = structureNodes.get(st.id);
    if (n === undefined) {
      const boxG = new Graphics({ roundPixels: true });
      const cap = new Text({
        text: "",
        style: {
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          fontWeight: "600",
          fill: cssColorToPixi(palette.text),
          wordWrap: true,
          wordWrapWidth: 140,
        },
      });
      n = { box: boxG, caption: cap };
      structureNodes.set(st.id, n);
      structureLayer.addChild(boxG);
      structureLayer.addChild(cap);
    }
    const { x: sx, y: sy } = worldToScreen(st.x, st.y);
    const strokeCol = cssColorToPixi(palette.stroke);
    const isMcpStore = st.id.startsWith("mcp:");
    if (st.kind === "home") {
      drawHomeStructure(n.box, box, theme.house);
      n.box.position.set(sx, sy);
      n.caption.text = (st.label ?? "Home").slice(0, 24);
      n.caption.position.set(sx - n.caption.width / 2, sy - box * 1.15);
    } else if (isMcpStore) {
      const storePal = mcpStorePalette(palette);
      const storeBox = box * 1.12;
      drawMcpStore(n.box, storeBox, storePal);
      n.box.position.set(sx - storeBox * 0.42, sy - storeBox * 0.48);
      n.caption.text = (st.label ?? "Store").slice(0, 22);
      n.caption.position.set(sx - n.caption.width / 2, sy - storeBox * 0.92);
    } else {
      const stallPal = vendorStallPalette(palette);
      drawVendorStall(n.box, box, stallPal);
      n.box.position.set(sx - box * 0.38, sy - box * 0.42);
      const capText =
        st.toolName !== undefined && st.toolName.length > 0
          ? st.toolName
          : (st.label ?? st.id).slice(0, 28);
      n.caption.text = capText.slice(0, 28);
      n.caption.position.set(sx - n.caption.width / 2, sy - box * 0.92);
    }
  }
}

function syncAgentNodes(): void {
  const rowsBase = snapshot === null ? [] : listAgentRows(snapshot);
  const rows =
    snapshot === null
      ? []
      : rowsBase.some((r) => r.agentId === HUMAN_VIEWER_PLAYER_ID)
        ? [...rowsBase]
        : [
            ...rowsBase,
            {
              agentId: HUMAN_VIEWER_PLAYER_ID,
              name: "You",
              structures: [] as Structure[],
            },
          ];
  const alive = new Set(rows.map((r) => r.agentId));
  for (const id of agentNodes.keys()) {
    if (!alive.has(id)) {
      const v = agentNodes.get(id);
      if (v !== undefined) {
        agentsLayer.removeChild(v.root);
        v.root.destroy({ children: true });
      }
      agentNodes.delete(id);
      playerWorldPos.delete(id);
      waypointQueues.delete(id);
      walkPhaseByPlayer.delete(id);
      facingByPlayer.delete(id);
      movingByPlayer.delete(id);
      lastTickWorldPos.delete(id);
    }
  }
  for (const p of rows) {
    if (!agentNodes.has(p.agentId)) {
      const v = makeAgentVisual();
      agentNodes.set(p.agentId, v);
      agentsLayer.addChild(v.root);
    }
  }
}

function paintGrid(): void {
  const theme = getActiveSceneTheme();
  gridGraphics.clear();
  if (gridBounds === null) return;
  const pad = 1;
  const cols = Math.max(
    1,
    Math.ceil(gridBounds.maxX - gridBounds.minX + 2 * pad)
  );
  const rows = Math.max(
    1,
    Math.ceil(gridBounds.maxY - gridBounds.minY + 2 * pad)
  );
  const gs = theme.gridStroke;
  const gy0 = worldOriginScreenY;
  for (let c = 0; c <= cols; c += 1) {
    const gx = ORIGIN_X + c * cellScale;
    gridGraphics
      .moveTo(gx, gy0)
      .lineTo(gx, gy0 + rows * cellScale)
      .stroke({ width: 1, color: gs.color, alpha: gs.alpha });
  }
  for (let r = 0; r <= rows; r += 1) {
    const gy = gy0 + r * cellScale;
    gridGraphics
      .moveTo(ORIGIN_X, gy)
      .lineTo(ORIGIN_X + cols * cellScale, gy)
      .stroke({ width: 1, color: gs.color, alpha: gs.alpha });
  }
}

function getDebugSnapshot(): {
  agents: readonly {
    playerId: string;
    name: string;
    worldX: number;
    worldY: number;
  }[];
  structures: readonly {
    id: string;
    kind: string;
    x: number;
    y: number;
    toolName?: string;
    playerId?: string;
  }[];
} {
  if (snapshot === null) {
    return { agents: [], structures: [] };
  }
  const agents = listAgentRows(snapshot).map((p) => {
    const pos = playerWorldPos.get(p.agentId);
    return {
      playerId: p.agentId,
      name: p.name,
      worldX: pos?.x ?? 0,
      worldY: pos?.y ?? 0,
    };
  });
  const humanPos = playerWorldPos.get(HUMAN_VIEWER_PLAYER_ID);
  if (!agents.some((a) => a.playerId === HUMAN_VIEWER_PLAYER_ID)) {
    agents.push({
      playerId: HUMAN_VIEWER_PLAYER_ID,
      name: "You",
      worldX: humanPos?.x ?? 0,
      worldY: humanPos?.y ?? 0,
    });
  }
  const structures = collectStructuresForRender(snapshot).map((s) => ({
    id: s.id,
    kind: s.kind,
    x: s.x,
    y: s.y,
    toolName: s.toolName,
    playerId: s.agentId ?? s.playerId,
  }));
  return { agents, structures };
}

function applyChatVisibility(): void {
  const show = getPreviewViewSettings().showChatUi;
  if (agentChatOverlays !== null) {
    agentChatOverlays.root.style.visibility = show ? "visible" : "hidden";
    agentChatOverlays.root.style.pointerEvents = show ? "auto" : "none";
  }
}

function applyDebugVisibility(): void {
  if (debugMountEl === null) return;
  const on = getPreviewViewSettings().debugMode;
  debugMountEl.classList.toggle("preview-debug-mount--visible", on);
  if (on) {
    debugPanelUpdate?.();
  }
}

function applyJoystickVisibility(): void {
  const v = getPreviewViewSettings();
  const show = v.joystickEnabled;
  joystickHandle?.setVisible(show);
  if (!show) {
    setJoystickVectorZero();
  }
}

function rebuildSceneForTheme(): void {
  if (appStage === null || pixiHandle === null) return;
  const theme = getActiveSceneTheme();
  palette = mergeMultiversePalette(theme.palettePartial);
  pixiHandle.app.renderer.background.color = new Color(theme.appBackgroundColor);
  if (sceneRootContainer !== null) {
    appStage.removeChild(sceneRootContainer);
    sceneRootContainer.destroy({ children: true });
    sceneRootContainer = null;
  }
  if (crowdLayerContainer !== null) {
    appStage.removeChild(crowdLayerContainer);
    crowdLayerContainer.destroy({ children: true });
    crowdLayerContainer = null;
  }
  sceneRootContainer = theme.buildScene(VIEW_W, VIEW_H, 0x5cafe);
  appStage.addChildAt(sceneRootContainer, 0);
  if (ENABLE_CROWD_LAYER) {
    const groundTop = VIEW_H * theme.grassBandTopRatio;
    const crowdClusters = layoutCrowdClusters({
      width: VIEW_W,
      height: VIEW_H,
      seed: 0x5cafe + theme.crowdSeedSalt,
      groundTop,
      groundBottom: VIEW_H - 20,
      clusterCountRange: [4, 8],
    });
    crowdLayerContainer = buildCrowdLayer(crowdClusters);
    appStage.addChildAt(crowdLayerContainer, 1);
  }
}

function onTick(dt: number): void {
  const speed = 2.2;
  const joySpeed = 3.5;
  const arrowSpeed = 2.8;
  const wb = getWorldBoundsForClamp();
  const settings = getPreviewViewSettings();
  const primaryId = getHumanPlayerId();
  const joystickActive =
    settings.joystickEnabled && primaryId !== null;
  const jv = joystickActive ? getJoystickVector() : { x: 0, y: 0 };
  const joyLen = Math.hypot(jv.x, jv.y);
  const anyArrow =
    arrowKeys.up || arrowKeys.down || arrowKeys.left || arrowKeys.right;

  if (
    shouldClearPrimaryWaypointsWhileJoystickIdle({
      joystickActive,
      joyVectorLength: joyLen,
    }) &&
    primaryId !== null
  ) {
    waypointQueues.delete(primaryId);
  }

  for (const [id, pos] of playerWorldPos) {
    if (id !== HUMAN_VIEWER_PLAYER_ID) continue;
    const prev = { ...pos };
    let next = { ...pos };
    const useJoy =
      joystickActive &&
      joyLen > JOYSTICK_DEFLECT_EPS &&
      id === primaryId;
    const useArrows =
      primaryId !== null &&
      id === primaryId &&
      !useJoy &&
      anyArrow;

    if (useJoy) {
      waypointQueues.delete(id);
      next = {
        x: pos.x + jv.x * joySpeed * dt,
        y: pos.y + jv.y * joySpeed * dt,
      };
    } else if (useArrows) {
      waypointQueues.delete(id);
      const dx = (arrowKeys.right ? 1 : 0) - (arrowKeys.left ? 1 : 0);
      const dy = (arrowKeys.down ? 1 : 0) - (arrowKeys.up ? 1 : 0);
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        next = {
          x: pos.x + (dx / len) * arrowSpeed * dt,
          y: pos.y + (dy / len) * arrowSpeed * dt,
        };
      }
    } else {
      const queue = waypointQueues.get(id);
      if (queue && queue.length > 0) {
        const target = queue[0];
        if (target) {
          next = moveToward(pos, target, speed, dt);
          if (Math.hypot(target.x - next.x, target.y - next.y) < 0.08) {
            queue.shift();
          }
        }
      }
    }
    let shouldClamp = shouldClampWorldPositionWhenJoystickDriving({
      playerId: id,
      primaryPlayerId: primaryId,
      joystickActive,
    });
    if (useArrows && primaryId !== null && id === primaryId) {
      shouldClamp = true;
    }
    if (wb !== null && shouldClamp) {
      next = clampWorldPosition(next, wb);
    }
    playerWorldPos.set(id, next);
    const motion = nextAvatarMotion({
      prevWorld: prev,
      nextWorld: next,
      prevFacing: facingByPlayer.get(id) ?? "right",
      prevWalkPhase: walkPhaseByPlayer.get(id) ?? 0,
      dt,
      stepsPerSecondWhileWalking: 7,
    });
    facingByPlayer.set(id, motion.facing);
    walkPhaseByPlayer.set(id, motion.walkPhase);
    movingByPlayer.set(id, motion.isMoving);
    lastTickWorldPos.set(id, { ...next });
  }
}

function onFrame(): void {
  if (appStage === null) return;
  paintGrid();
  const structs =
    snapshot !== null ? collectStructuresForRender(snapshot) : [];
  syncStructureNodes(structs);
  syncAgentNodes();
  const aliveIds =
    snapshot === null ? [] : listAgentRows(snapshot).map((p) => p.agentId);
  agentChatOverlays?.syncAgentIds(aliveIds);
  const box = Math.max(16, Math.min(40, cellScale * 0.85));
  for (const [id, wpos] of playerWorldPos) {
    const v = agentNodes.get(id);
    if (v === undefined) continue;
    const { cx, cy } = getAgentHeroAnchorScreen(id, wpos, box);
    const scale = Math.max(0.35, Math.min(0.85, cellScale / 48));
    v.root.position.set(cx, cy);
    drawPlatformHero(v.hero, {
      scale,
      facing: facingByPlayer.get(id) ?? "right",
      walkPhase: walkPhaseByPlayer.get(id) ?? 0,
      isMoving: movingByPlayer.get(id) ?? false,
    });
    const displayName =
      snapshot === null
        ? id
        : listAgentRows(snapshot).find((pl) => pl.agentId === id)?.name ?? id;
    v.nameTag.text = displayName;
    v.nameTag.position.set(-v.nameTag.width / 2, box * 0.45);
    if (getPreviewViewSettings().showChatUi) {
      const chatDisplay = getAgentChatDisplaySettings();
      const layout = computeAgentChatPanelPosition({
        anchorScreenX: cx,
        anchorScreenY: cy,
        panelWidth: chatDisplay.panelWidthPx,
        panelLayoutHeightPx: layoutHeightFromScrollMax(
          chatDisplay.scrollMaxHeightPx
        ),
        viewportWidth: VIEW_W,
        viewportHeight: VIEW_H,
        marginPx: PREVIEW_AGENT_CHAT_MARGIN_PX,
        gapAboveAgentPx: PREVIEW_AGENT_CHAT_GAP_PX,
        horizontalNudgePx: agentChatHorizontalNudgePx(id),
      });
      agentChatOverlays?.setLayout(id, layout.left, layout.top);
    }
  }
  const primaryPid = getHumanPlayerId();
  if (
    primaryPid !== null &&
    (snapshot === null ? 0 : listAgentRows(snapshot).length) >= 1
  ) {
    const allowedPartners = new Set(aliveIds);
    lastProximityPartnerId = findNearestProximityPartner({
      primaryId: primaryPid,
      positions: playerWorldPos,
      radius: DEFAULT_PROXIMITY_RADIUS,
      allowedPartnerIds: allowedPartners,
    });
  } else {
    lastProximityPartnerId = null;
  }
  if (proximityLegendEl !== null) {
    if (lastProximityPartnerId !== null) {
      proximityLegendEl.textContent = `Near ${playerDisplayName(lastProximityPartnerId)}. A: for assist · C: for chat · Z: for zone · Y: for yield`;
    } else {
      proximityLegendEl.textContent =
        "Near another player: A: for assist · C: for chat · Z: for zone · Y: for yield";
    }
  }
  if (proximityPromptEl !== null) {
    if (lastProximityPartnerId !== null) {
      const pos = playerWorldPos.get(lastProximityPartnerId);
      if (pos !== undefined) {
        const { cx, cy } = getAgentHeroAnchorScreen(lastProximityPartnerId, pos, box);
        proximityPromptEl.style.display = "block";
        proximityPromptEl.style.left = `${cx}px`;
        proximityPromptEl.style.top = `${cy - box * 1.35}px`;
      } else {
        proximityPromptEl.style.display = "none";
      }
    } else {
      proximityPromptEl.style.display = "none";
    }
  }
  agentChatOverlays?.setProximityFocus(lastProximityPartnerId);
  if (getPreviewViewSettings().debugMode) {
    debugPanelUpdate?.();
  }
}

export function bootstrap(): void {
  if (previewBootstrapStarted) return;
  if (previewBootstrapLock !== null) {
    void previewBootstrapLock;
    return;
  }
  previewBootstrapLock = (async () => {
    const sid = await ensurePreviewSessionId();
    if (!sid) return;
    await ensureHumanNodeOnboarding({
      apiBase: API_BASE,
      getSid: () => sid,
    });
    if (previewBootstrapStarted) return;
    previewBootstrapStarted = true;
    const theme = getActiveSceneTheme();
    palette = mergeMultiversePalette(theme.palettePartial);
    ensurePreviewChatStyles();
    ensurePreviewLayoutStyles();
    const mount =
      document.getElementById("watch-root") ?? document.body;
    const shell = document.createElement("div");
    shell.className = "preview-shell";
    mount.appendChild(shell);

    const gamePanel = document.createElement("div");
    gamePanel.className = "preview-game-panel";

    const gameRow = document.createElement("div");
    gameRow.className = "preview-game-row";

    const canvasStage = document.createElement("div");
    canvasStage.className = "preview-canvas-stage";

    const leftCol = document.createElement("div");
    leftCol.className = "preview-game-col preview-game-col--left";
    leftCol.id = "preview-side-left";

    const debugMount = document.createElement("div");
    debugMount.className = "preview-debug-mount";
    debugMountEl = debugMount;
    const debug = createPreviewDebugPanel({
      getSnapshot: getDebugSnapshot,
    });
    debugPanelUpdate = debug.update;
    debugMount.appendChild(debug.element);
    leftCol.appendChild(debugMount);

    const centerCol = document.createElement("div");
    centerCol.className = "preview-game-col preview-game-col--center";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "preview-canvas-wrap";

    const canvasHost = document.createElement("div");
    canvasHost.style.cssText = `display:block;position:relative;width:${VIEW_W}px;max-width:100%;height:${VIEW_H}px;margin:0 auto;overflow:hidden;`;

    const joystickWrap = document.createElement("div");
    joystickWrap.className = "preview-joystick-wrap";

    canvasWrap.appendChild(canvasHost);

    const mobileBackdrop = document.createElement("button");
    mobileBackdrop.type = "button";
    mobileBackdrop.className = "preview-mobile-side-backdrop";
    mobileBackdrop.setAttribute("aria-label", "Close side panel");

    const mobileToggles = document.createElement("div");
    mobileToggles.className = "preview-mobile-side-toggles";
    const toggleLeft = document.createElement("button");
    toggleLeft.type = "button";
    toggleLeft.className =
      "preview-mobile-side-toggle preview-mobile-side-toggle--left";
    toggleLeft.textContent = "Debug";
    toggleLeft.setAttribute("aria-controls", "preview-side-left");
    const toggleRight = document.createElement("button");
    toggleRight.type = "button";
    toggleRight.className =
      "preview-mobile-side-toggle preview-mobile-side-toggle--right";
    toggleRight.textContent = "Session";
    toggleRight.setAttribute("aria-controls", "preview-side-right");
    mobileToggles.append(toggleLeft, toggleRight);

    centerCol.append(
      canvasWrap,
      joystickWrap,
      mobileBackdrop,
      mobileToggles
    );

    const rightCol = document.createElement("div");
    rightCol.className = "preview-game-col preview-game-col--right";
    rightCol.id = "preview-side-right";

    agentChatOverlays = createPreviewAgentChatOverlays();
    refreshPreviewChat = () => {
      agentChatOverlays?.refreshAll();
    };

    const controlStack = document.createElement("div");
    controlStack.className = "preview-control-stack";

    const proximityLegend = document.createElement("div");
    proximityLegend.className = "preview-proximity-legend";
    proximityLegend.textContent =
      "Near another player: A: for assist · C: for chat · Z: for zone · Y: for yield";
    proximityLegendEl = proximityLegend;

    const chatPanel = createPreviewChatSettingsPanel({
      embeddedInToolbar: true,
      onSettingsApplied: () => {
        agentChatOverlays?.applyDisplaySettings();
      },
    });
    const sessionToolsPanel = createPreviewSessionToolsPanel();
    const sessionProfilePanel = createPreviewSessionProfilePanel({
      onProfileApplied: () => {},
    });
    sessionInteractionPanel = createPreviewSessionInteractionPanel({
      getSid,
      apiBase: API_BASE,
      getMainNodeId: getMainNodeIdForIntercom,
      onHumanNodeLifecycle: async (action) => {
        if (action === "replace") {
          clearHumanCredentials();
        }
        await ensureHumanNodeOnboarding({
          apiBase: API_BASE,
          getSid: () => sid,
        });
        sessionInteractionPanel?.refresh();
      },
    });

    controlStack.append(proximityLegend, sessionInteractionPanel.element);
    rightCol.appendChild(controlStack);

    canvasStage.append(leftCol, centerCol, rightCol);
    gameRow.appendChild(canvasStage);
    gamePanel.appendChild(gameRow);
    shell.appendChild(gamePanel);

    mobileSidePanelControls = attachMobileSidePanelControls({
      shell,
      toggleLeft,
      toggleRight,
      backdrop: mobileBackdrop,
    });

    worldLayer.addChild(gridGraphics);
    worldLayer.addChild(structureLayer);
    const handle = await createPixiPreview({
      width: VIEW_W,
      height: VIEW_H,
      parent: canvasHost,
      backgroundColor: theme.appBackgroundColor,
      onTick,
      onFrame,
    });
    pixiHandle = handle;
    appStage = handle.app.stage;
    sceneRootContainer = theme.buildScene(VIEW_W, VIEW_H, 0x5cafe);
    handle.app.stage.addChild(sceneRootContainer);
    if (ENABLE_CROWD_LAYER) {
      const groundTop = VIEW_H * theme.grassBandTopRatio;
      const crowdClusters = layoutCrowdClusters({
        width: VIEW_W,
        height: VIEW_H,
        seed: 0x5cafe + theme.crowdSeedSalt,
        groundTop,
        groundBottom: VIEW_H - 20,
        clusterCountRange: [4, 8],
      });
      crowdLayerContainer = buildCrowdLayer(crowdClusters);
      handle.app.stage.addChild(crowdLayerContainer);
    }
    handle.app.stage.addChild(worldLayer);
    handle.app.stage.addChild(agentsLayer);

    canvasHost.appendChild(agentChatOverlays.root);
    proximityPromptEl = document.createElement("div");
    proximityPromptEl.className = "preview-proximity-prompt";
    proximityPromptEl.textContent = "A: for assist\nC: for chat";
    canvasHost.appendChild(proximityPromptEl);

    joystickHandle = createPreviewDebugJoystick({ parent: joystickWrap });

    shell.appendChild(
      createPreviewBottomBar({
        chatPanel,
        sessionToolsPanel,
        sessionProfilePanel,
        onThemeApplied: () => {
          rebuildSceneForTheme();
        },
        onAgentSettingsChanged: () => {
          applyChatVisibility();
          applyDebugVisibility();
          applyJoystickVisibility();
        },
      })
    );

    applyChatVisibility();
    applyDebugVisibility();
    applyJoystickVisibility();

    window.addEventListener("keydown", onDocumentKeyDown);
    window.addEventListener("keyup", onDocumentKeyUp);

    void loadSnapshot(sid).then(() => connectSse(sid));
  })().finally(() => {
    previewBootstrapLock = null;
  });
}

if (
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  "DEV" in import.meta.env &&
  (import.meta.env as { DEV?: boolean }).DEV === true
) {
  bootstrap();
}
