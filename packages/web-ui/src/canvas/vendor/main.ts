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
import {
  createStageController,
  type StageController,
} from "./stage-controller.js";
import { createOverworldStage } from "./overworld-stage.js";
import {
  buildSpaceYardStage,
  clampYardPosition,
  yardSpawnPosition,
  YARD_BOUNDS,
  EXIT_DOOR_PROXIMITY_RADIUS_WORLD,
  nextEnclosedStageInputDirection,
  findNearestYardAmenityPad,
  YARD_AMENITY_PROXIMITY_RADIUS_WORLD,
  type SpaceYardStageHandle,
  type YardPlayerAnim,
  type YardAmenityPadPosition,
} from "./space-yard-stage.js";
import {
  buildAmenityShopStage,
  SHOP_BOUNDS,
  type AmenityShopStageHandle,
} from "./amenity-shop-stage.js";
import {
  buildAmenitySupermarketStage,
  SUPERMARKET_BOUNDS,
  type AmenitySupermarketStageHandle,
} from "./amenity-supermarket-stage.js";
import {
  buildAmenityCarWashStage,
  CAR_WASH_BOUNDS,
  type AmenityCarWashStageHandle,
} from "./amenity-carwash-stage.js";
import type { AmenityStageBounds } from "./amenity-stage-base.js";
import { resolveAmenityContent } from "./amenity-content-resolver.js";
import {
  resolveNearestAmenityBuyable,
  type AmenityBuyable,
} from "./amenity-item-buyable.js";
import { createItemTooltip, type ItemTooltipHandle } from "./item-tooltip.js";
import { executePurchase } from "./purchase-client.js";
import { createWalletHud, type WalletHudHandle } from "./wallet-hud.js";
import { fetchPlayerWallet } from "./wallet-client.js";
import {
  createWalletInventoryPanel,
  type WalletInventoryPanelHandle,
} from "./wallet-inventory-panel.js";
import { fetchPurchases } from "./wallet-purchases-client.js";
import { redeemWalletBundle } from "./wallet-bundle-client.js";
import { deepLogObject, deepLogText, deepLogTree } from "./browser-deep-logs.js";
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
  createVerticalStripSeedLayout,
  DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
  expandBoundsToMinimumPlayArea,
  isAgentSpawnOccupancyPointAvailableInZone,
  isSpaceAnchorOccupancyPointAvailableInZone,
  listOccupancyPointsForZone,
  mergeSnapshotWithPlayerChainNode,
  MINIMUM_PLAY_WORLD_BOUNDS,
  MINIMUM_STREET_LAYOUT_BOUNDS,
  occupancyKeyForPosition,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  pickZoneForGroup,
  pointCellInZone,
  SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE,
  sortNodeRefsForSerializedFetch,
  STREET_NAME_POOL,
  type AgentPlaySnapshot,
  type OccupantGroup,
  type WorldBounds,
  type WorldLayout,
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
  shouldClearPrimaryWaypointsWhileJoystickIdle,
} from "./preview-debug-joystick.js";
import {
  isPlayPadKeyChar,
  isPlayPadTwoLetterCombo,
  PLAY_PAD_SEQUENCE_WINDOW_MS,
  resolvePlayPadInputFromKeyBuffer,
} from "./preview-play-pad-keys.js";
import { createPreviewDebugPanel } from "./preview-debug-panel.js";
import {
  GEOGRAPHY_PUBLISH_INTERVAL_MS,
  postGeographyLeave,
  postGeographyPresence,
} from "./preview-world-geography.js";
import {
  mountStreetSignPosts,
  type StreetSignZone,
} from "./world-street-signs.js";
import { createPixiPreview, type PixiPreviewHandle } from "./pixi-multiverse.js";
import {
  attachMobileSidePanelControls,
  PREVIEW_WIDE_SIDEBAR_MEDIA_QUERY,
} from "./preview-mobile-side-panels.js";
import { createPreviewProximityTouchControls } from "./preview-proximity-touch-controls.js";
import { createPreviewGlobalChatRoom } from "./preview-global-chat-room";
import { createPreviewSpacesCtaPanel } from "./preview-spaces-cta-panel";
import {
  createPreviewBottomBar,
  ensurePreviewLayoutStyles,
} from "./preview-settings-toolbar.js";
import {
  attachPreviewFloatingPanelDrag,
  syncPreviewCanvasHostScale,
} from "./preview-floating-panel.js";
import {
  getPreviewViewSettings,
  setPreviewViewSettings,
} from "./preview-view-settings.js";
import { reportP2aToggleIfChanged } from "./presentation-analytics.js";
import { createSkyDecorLayer } from "./sky-decor.js";
import { ENABLE_CROWD_LAYER, getActiveSceneTheme } from "./scene-theme.js";
import {
  drawCarWashStructure,
  drawHomeStructure,
  drawMcpStore,
  drawShopStructure,
  drawSupermarketStructure,
  drawVendorStall,
  type AmenityBuildingPalette,
} from "./structure-art.js";
import { buildParkWorldBackdrop } from "./scene-backgrounds.js";
import {
  clampCameraToWorldRect,
  computeWorldRootScrollRect,
  type WorldCameraClampRect,
} from "./world-nav-math.js";
import type { AvatarFacing } from "./avatar-anim.js";
import {
  DEFAULT_PROXIMITY_RADIUS,
  DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
  findNearestProximityPartner,
  findNearestStructureProximityTarget,
  proximityKeyToAction,
  type ProximityActionKind,
  type StructureProximityTarget,
} from "./proximity-interaction.js";
import {
  countAmenitiesInSpaceCompound,
  representativePrimaryAmenityForCompound,
} from "./space-compound-art.js";

type ConsoleWorldLayoutBoundsField = "minX" | "minY" | "maxX" | "maxY";

type ConsoleWorldLayoutBoundsSnapshot = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ConsoleWorldLayoutZoneSnapshot = {
  id: string;
  streetId: string;
  streetLabel: string;
  primaryGroup: OccupantGroup;
  rect: ConsoleWorldLayoutBoundsSnapshot;
};

type ConsoleWorldLayoutSnapshot = {
  rev: number;
  bounds: ConsoleWorldLayoutBoundsSnapshot;
  zones: readonly ConsoleWorldLayoutZoneSnapshot[];
};

type ConsoleWorldApi = {
  occupant: {
    move: (next: [number, number]) => { x: number; y: number } | null;
    id: () => string | null;
  };
  occupants: {
    list: () => Array<{ id: string; x: number; y: number }>;
    move: (
      id: string,
      next: [number, number]
    ) => { id: string; x: number; y: number } | null;
    get: (id: string) => { id: string; x: number; y: number } | null;
  };
  grid: () => {
    cellScale: number;
    originX: number;
    worldOriginScreenY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  layout: {
    get: () => ConsoleWorldLayoutSnapshot | null;
    bounds: {
      get: () => ConsoleWorldLayoutBoundsSnapshot | null;
      set: (
        field: ConsoleWorldLayoutBoundsField,
        value: number
      ) => Promise<ConsoleWorldLayoutSnapshot>;
    };
  };
};

declare global {
  var world: ConsoleWorldApi | undefined;
}

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
const WORLD_GEOGRAPHY_SSE = "world:geography";
const WORLD_GLOBAL_CHAT_CHANNEL = "intercom:world:global";
const AP_INTERCOM_PROTOCOL = "ap-intercom";
function buildIntercomAddress(nodeId: string): string {
  return `${AP_INTERCOM_PROTOCOL}://${nodeId.trim()}`;
}
const HUMAN_VIEWER_PLAYER_ID = "__human__";
const MAX_PLAYER_CHAIN_FETCH_STEPS = 102;
const HOME_STAND_EPS = 0.26;
const HOME_FRONT_OFFSET_WX = 0.16;
const HOME_FRONT_OFFSET_WY = 0.22;
const PREVIEW_AGENT_CHAT_MARGIN_PX = 6;
const PREVIEW_AGENT_CHAT_GAP_PX = 8;

const HUMAN_DEFAULT_SPAWN_UX = 0.1;
const HUMAN_DEFAULT_SPAWN_UY = 0.12;

/** Snapshot structure row (subset of server JSON). */
type Structure = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label?: string;
  name?: string;
  toolName?: string;
  agentId?: string;
  playerId?: string;
  primaryAmenity?: string;
  amenities?: string[];
  spaceIds?: readonly string[];
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
  enableP2a?: "on" | "off";
  realtimeInstructions?: string;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
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
  enableP2a?: "on" | "off";
  realtimeInstructions?: string;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
};

type SnapshotMcpOccupant = {
  kind: "mcp";
  id: string;
  name: string;
  x: number;
  y: number;
  url?: string;
};

type SnapshotHumanOccupant = {
  kind: "human";
  id: string;
  name: string;
  x: number;
  y: number;
  facing?: "left" | "right";
  isMoving?: boolean;
};

type SnapshotStructureOccupant = {
  kind: "structure";
  id: string;
  name: string;
  x: number;
  y: number;
  worldId: string;
  spaceIds: string[];
  primaryAmenity?: string;
  amenities?: string[];
};

type SnapshotWorldLayoutZone = {
  id: string;
  streetId: string;
  streetLabel: string;
  rect: WorldBounds;
  primaryGroup: OccupantGroup;
  allowedGroups: readonly OccupantGroup[];
};

type SnapshotWorldLayout = {
  rev: number;
  bounds: WorldBounds;
  zones: readonly SnapshotWorldLayoutZone[];
  streets: readonly { id: string; label: string }[];
};

type WorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  occupants: (
    | SnapshotAgentOccupant
    | SnapshotMcpOccupant
    | SnapshotStructureOccupant
    | SnapshotHumanOccupant
  )[];
};

type SnapshotMcpRegistration = {
  id: string;
  name: string;
  url?: string;
};

type SnapshotSpaceCatalogEntry = {
  id: string;
  amenityContent?: {
    shopItems?: ReadonlyArray<unknown>;
    supermarketItems?: ReadonlyArray<unknown>;
    carWashCars?: ReadonlyArray<unknown>;
  };
};

type Snapshot = {
  sid: string;
  worldMap: WorldMapJson;
  worldLayout?: SnapshotWorldLayout;
  mcpServers?: SnapshotMcpRegistration[];
  spaces?: SnapshotSpaceCatalogEntry[];
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

function snapshotEnableP2aFlag(raw: unknown): "on" | "off" | undefined {
  if (raw === "on" || raw === "off") {
    return raw;
  }
  return undefined;
}

function snapshotRealtimeWebrtc(
  raw: unknown
):
  | { clientSecret: string; expiresAt?: string; model: string; voice?: string }
  | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const rec = raw as Record<string, unknown>;
  if (typeof rec.clientSecret !== "string" || rec.clientSecret.length === 0) {
    return undefined;
  }
  if (typeof rec.model !== "string" || rec.model.length === 0) {
    return undefined;
  }
  const out: { clientSecret: string; expiresAt?: string; model: string; voice?: string } = {
    clientSecret: rec.clientSecret,
    model: rec.model,
  };
  if (typeof rec.expiresAt === "string" && rec.expiresAt.length > 0) {
    out.expiresAt = rec.expiresAt;
  }
  if (typeof rec.voice === "string" && rec.voice.length > 0) {
    out.voice = rec.voice;
  }
  return out;
}

function snapshotRealtimeInstructions(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function listHumanRows(s: Snapshot): SnapshotHumanOccupant[] {
  return s.worldMap.occupants.filter(
    (o): o is SnapshotHumanOccupant => o.kind === "human"
  );
}

function getLocalGeographyHumanId(): string | null {
  return getMainNodeIdForIntercom();
}

function listMapRenderableRows(s: Snapshot): AgentRow[] {
  const agents = listAgentRows(s);
  if (!getPreviewViewSettings().worldGeographyEnabled) {
    return agents;
  }
  const localId = getLocalGeographyHumanId();
  const remoteHumans = listHumanRows(s)
    .filter((h) => localId === null || h.id !== localId)
    .map((h) => ({
      agentId: h.id,
      name: h.name,
      structures: [] as Structure[],
    }));
  return [...agents, ...remoteHumans];
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
      enableP2a: snapshotEnableP2aFlag(
        (o as { enableP2a?: unknown }).enableP2a
      ),
      realtimeInstructions: snapshotRealtimeInstructions(
        (o as { realtimeInstructions?: unknown }).realtimeInstructions
      ),
      realtimeWebrtc: snapshotRealtimeWebrtc(
        (o as { realtimeWebrtc?: unknown }).realtimeWebrtc
      ),
    }));
}

type AgentVisual = {
  root: Container;
  hero: Graphics;
  nameTag: Text;
};

type StructureVisual = {
  root: Container;
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
 * Fixed cell size in px; logical bounds at least {@link MINIMUM_PLAY_WORLD_BOUNDS}.
 * @remarks **Callers:** {@link loadSnapshot}, theme rebuilds. **Callees:** none.
 */
function applyBounds(bounds: WorldMapJson["bounds"]): void {
  const expanded = expandBoundsToMinimumPlayArea(bounds);
  gridBounds = expanded;
  const pad = 1;
  cellScale = CELL;
  mapMinX = expanded.minX - pad;
  mapMinY = expanded.minY - pad;
  mapMaxX = expanded.maxX + pad;
  mapMaxY = expanded.maxY + pad;
  const maxBottom = VIEW_H - WORLD_BOTTOM_MARGIN;
  const h = Math.max(1, mapMaxY - mapMinY + 1);
  worldOriginScreenY = maxBottom - h * cellScale;
  rebuildParkWorldBackdrop();
}

function rebuildParkWorldBackdrop(): void {
  if (gridBounds === null) {
    return;
  }
  for (const ch of [...parkBackdropLayer.children]) {
    parkBackdropLayer.removeChild(ch);
    ch.destroy({ children: true });
  }
  const pad = 1;
  const cols = Math.max(
    1,
    Math.ceil(gridBounds.maxX - gridBounds.minX + 2 * pad)
  );
  const rows = Math.max(
    1,
    Math.ceil(gridBounds.maxY - gridBounds.minY + 2 * pad)
  );
  const gy0 = worldOriginScreenY;
  const w = ORIGIN_X + cols * cellScale + 56;
  const h = Math.max(VIEW_H, gy0 + rows * cellScale + WORLD_BOTTOM_MARGIN);
  deepLogObject("rebuildParkWorldBackdrop", { w, h, cols, rows });
  parkBackdropLayer.addChild(buildParkWorldBackdrop(w, h, 0x5cafe));
}

function worldToWorldRootLocal(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (wx - mapMinX) * cellScale,
    y: worldOriginScreenY + (mapMaxY - wy) * cellScale,
  };
}

function worldRootLocalToCanvas(lx: number, ly: number): { x: number; y: number } {
  return {
    x: cameraX + lx,
    y: cameraY + ly,
  };
}

function getCameraClampRect(): WorldCameraClampRect {
  if (gridBounds === null) {
    return { left: 0, top: 0, right: VIEW_W, bottom: VIEW_H };
  }
  return computeWorldRootScrollRect({
    originX: ORIGIN_X,
    worldOriginScreenY,
    cellScale,
    mapMinX,
    mapMinY,
    mapMaxX,
    mapMaxY,
  });
}

function updateCameraAndWorldRoot(): void {
  const hid = getHumanPlayerId();
  const pos = hid !== null ? playerWorldPos.get(hid) : undefined;
  if (pos !== undefined) {
    const local = worldToWorldRootLocal(pos.x, pos.y);
    cameraX = VIEW_W / 2 - local.x;
    cameraY = VIEW_H / 2 - local.y;
  }
  const clamped = clampCameraToWorldRect({
    camX: cameraX,
    camY: cameraY,
    zoom: 1,
    viewW: VIEW_W,
    viewH: VIEW_H,
    rect: getCameraClampRect(),
  });
  cameraX = clamped.camX;
  cameraY = clamped.camY;
  worldRoot.position.set(cameraX, cameraY);
}

/**
 * @returns {@link WorldBounds} for {@link clampWorldPosition}, or `null` before first snapshot.
 * @remarks **Callers:** {@link setWaypoints}, {@link loadSnapshot}, joystick. **Callees:** none.
 */
function getWorldBoundsForClamp(): WorldBounds | null {
  if (gridBounds === null) return null;
  return { minX: mapMinX, minY: mapMinY, maxX: mapMaxX, maxY: mapMaxY };
}

function defaultHumanSpawnInWorld(wb: WorldBounds): { x: number; y: number } {
  const ref = MINIMUM_PLAY_WORLD_BOUNDS;
  const spanX = ref.maxX - ref.minX;
  const spanY = ref.maxY - ref.minY;
  const x = ref.minX + HUMAN_DEFAULT_SPAWN_UX * spanX;
  const y = ref.minY + HUMAN_DEFAULT_SPAWN_UY * spanY;
  return clampWorldPosition({ x, y }, wb);
}

const arrowKeys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let lastProximityPartnerId: string | null = null;
let lastStructureProximityTarget: StructureProximityTarget | null = null;
let proximityPromptEl: HTMLDivElement | null = null;
let proximityLegendEl: HTMLDivElement | null = null;
let proximityTouchPadHandle: { refresh: () => void } | null = null;

const playerWorldPos = new Map<string, { x: number; y: number }>();
let geographyLastPublishMs = 0;
const remoteGeographyHumanIds = new Set<string>();
const waypointQueues = new Map<string, Array<{ x: number; y: number }>>();
const lastTickWorldPos = new Map<string, { x: number; y: number }>();
const walkPhaseByPlayer = new Map<string, number>();
const facingByPlayer = new Map<string, AvatarFacing>();
const movingByPlayer = new Map<string, boolean>();

/** Latest RPC snapshot; drives rendering and chat. */
let snapshot: Snapshot | null = null;

function wireLayoutToRuntime(layout: SnapshotWorldLayout): WorldLayout {
  return {
    rev: layout.rev,
    bounds: { ...layout.bounds },
    zones: layout.zones.map((z) => ({
      ...z,
      rect: { ...z.rect },
      allowedGroups: [...z.allowedGroups],
    })),
    streets: layout.streets.map((s) => ({ ...s })),
  };
}

function resolveWorldLayout(): WorldLayout {
  if (
    snapshot?.worldLayout !== undefined &&
    snapshot.worldLayout.zones.length > 0
  ) {
    return wireLayoutToRuntime(snapshot.worldLayout);
  }
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("resolveWorldLayout: invalid street pool");
  }
  return createVerticalStripSeedLayout({
    bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
    streets: [s0, s1, s2],
  });
}

function zoneDebugStroke(primary: OccupantGroup): {
  width: number;
  color: number;
  alpha: number;
} {
  if (primary === "agent") {
    return { width: 3, color: 0xf97316, alpha: 0.95 };
  }
  if (primary === "space") {
    return { width: 3, color: 0x2563eb, alpha: 0.95 };
  }
  return { width: 3, color: 0xa855f7, alpha: 0.95 };
}

/**
 * @returns `__human__` id when snapshot exists (viewer-controlled pawn), else `null`.
 * @remarks **Callers:** keyboard handlers. **Callees:** none.
 */
function getHumanPlayerId(): string | null {
  return snapshot === null ? null : HUMAN_VIEWER_PLAYER_ID;
}

function getViewerWalletPlayerId(): string | null {
  return getMainNodeIdForIntercom();
}

function isLocalHostRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function resolveConsoleDefaultOccupantId(): string | null {
  const humanId = getHumanPlayerId();
  if (humanId !== null && playerWorldPos.has(humanId)) {
    return humanId;
  }
  const first = playerWorldPos.keys().next();
  return first.done ? null : first.value;
}

function moveOccupantFromConsole(
  id: string,
  next: [number, number]
): { id: string; x: number; y: number } | null {
  if (!playerWorldPos.has(id)) {
    console.warn("[agent-play:world] unknown occupant", { id });
    return null;
  }
  const wb = getWorldBoundsForClamp();
  const target = { x: next[0], y: next[1] };
  const clamped = wb !== null ? clampWorldPosition(target, wb) : target;
  playerWorldPos.set(id, clamped);
  waypointQueues.delete(id);
  updateCameraAndWorldRoot();
  const local = worldToWorldRootLocal(clamped.x, clamped.y);
  const screen = worldRootLocalToCanvas(local.x, local.y);
  const payload = {
    id,
    world: clamped,
    worldRounded: { x: Math.round(clamped.x), y: Math.round(clamped.y) },
    localPx: local,
    screenPx: screen,
    scale: {
      cellScale,
      view: { width: VIEW_W, height: VIEW_H },
    },
    bounds:
      wb !== null
        ? { minX: wb.minX, minY: wb.minY, maxX: wb.maxX, maxY: wb.maxY }
        : null,
  };
  console.info("[agent-play:world] occupant moved", payload);
  return { id, x: clamped.x, y: clamped.y };
}

function snapshotConsoleWorldLayout(): ConsoleWorldLayoutSnapshot | null {
  if (snapshot === null) return null;
  const wl = snapshot.worldLayout;
  if (wl === undefined) return null;
  return {
    rev: wl.rev,
    bounds: { ...wl.bounds },
    zones: wl.zones.map((z) => ({
      id: z.id,
      streetId: z.streetId,
      streetLabel: z.streetLabel,
      primaryGroup: z.primaryGroup as OccupantGroup,
      rect: { ...z.rect },
    })),
  };
}

async function postLayoutBoundsField(
  field: ConsoleWorldLayoutBoundsField,
  value: number
): Promise<ConsoleWorldLayoutSnapshot> {
  const sid = getSid();
  if (sid === null || sid.length === 0) {
    throw new Error("[agent-play:world] missing sid");
  }
  const url = `${API_BASE}/world-layout/bounds?sid=${encodeURIComponent(sid)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    worldLayout?: ConsoleWorldLayoutSnapshot;
    error?: string;
  };
  if (!res.ok) {
    const msg =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(res.status)}`;
    throw new Error(`[agent-play:world] world-layout/bounds: ${msg}`);
  }
  if (json.worldLayout === undefined) {
    throw new Error("[agent-play:world] world-layout/bounds: missing worldLayout");
  }
  return json.worldLayout;
}

function exposeWorldConsoleApi(): void {
  if (!isLocalHostRuntime()) {
    delete globalThis.world;
    return;
  }
  globalThis.world = {
    occupant: {
      move: (next) => {
        const id = resolveConsoleDefaultOccupantId();
        if (id === null) {
          console.warn("[agent-play:world] no default occupant available");
          return null;
        }
        const moved = moveOccupantFromConsole(id, next);
        return moved === null ? null : { x: moved.x, y: moved.y };
      },
      id: () => resolveConsoleDefaultOccupantId(),
    },
    occupants: {
      list: () =>
        [...playerWorldPos.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y })),
      move: (id, next) => moveOccupantFromConsole(id, next),
      get: (id) => {
        const p = playerWorldPos.get(id);
        return p === undefined ? null : { id, x: p.x, y: p.y };
      },
    },
    grid: () => ({
      cellScale,
      originX: ORIGIN_X,
      worldOriginScreenY,
      minX: mapMinX,
      minY: mapMinY,
      maxX: mapMaxX,
      maxY: mapMaxY,
    }),
    layout: {
      get: () => snapshotConsoleWorldLayout(),
      bounds: {
        get: () => snapshotConsoleWorldLayout()?.bounds ?? null,
        set: async (field, value) => {
          const next = await postLayoutBoundsField(field, value);
          console.info("[agent-play:world] layout bounds updated", {
            field,
            value,
            rev: next.rev,
            bounds: next.bounds,
          });
          return next;
        },
      },
    },
  };
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

function triggerProximityAssistOrChat(action: "assist" | "chat"): void {
  const partner = registeredAgentPartnerForProximityOrNull(
    lastProximityPartnerId
  );
  if (partner === null || partner === HUMAN_VIEWER_PLAYER_ID) return;
  sessionInteractionPanel?.setContext(partner);
  sessionInteractionPanel?.setMode(action);
  if (action === "chat") {
    sessionInteractionPanel?.focusChatInput();
  }
  if (mobileSidePanelControls?.isMobileViewport() === true) {
    mobileSidePanelControls.openRightPanel();
  }
  void sendProximityAction(partner, action);
}

function showP2aTargetNotEnabledModal(): void {
  const existing = document.getElementById("preview-p2a-target-modal");
  if (existing !== null) return;
  const overlay = document.createElement("div");
  overlay.id = "preview-p2a-target-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:13000;background:rgba(2,6,23,0.72);display:grid;place-items:center;padding:16px;";
  const card = document.createElement("div");
  card.style.cssText =
    "max-width:360px;width:100%;border-radius:12px;border:1px solid rgba(248,113,113,0.55);background:#0f172a;color:#e2e8f0;padding:16px;display:grid;gap:10px;";
  const title = document.createElement("h3");
  title.style.cssText = "margin:0;font-size:16px;color:#fecaca;";
  title.textContent = "Push to talk not available";
  const body = document.createElement("p");
  body.style.cssText = "margin:0;font-size:13px;line-height:1.45;color:#cbd5e1;";
  body.textContent =
    "Push to talk is not enabled for this agent. Register the agent with P2A on, or choose another agent.";
  const close = document.createElement("button");
  close.type = "button";
  close.style.cssText =
    "justify-self:end;border-radius:8px;border:1px solid rgba(148,163,184,0.45);background:rgba(30,41,59,0.95);color:#e2e8f0;padding:6px 10px;cursor:pointer;";
  close.textContent = "Got it";
  const remove = (): void => overlay.remove();
  close.addEventListener("click", remove);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      remove();
    }
  });
  card.append(title, body, close);
  overlay.append(card);
  document.body.append(overlay);
}

function showP2aRequiredModal(): void {
  const existing = document.getElementById("preview-p2a-required-modal");
  if (existing !== null) return;
  const overlay = document.createElement("div");
  overlay.id = "preview-p2a-required-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:13000;background:rgba(2,6,23,0.72);display:grid;place-items:center;padding:16px;";
  const card = document.createElement("div");
  card.style.cssText =
    "max-width:360px;width:100%;border-radius:12px;border:1px solid rgba(248,113,113,0.55);background:#0f172a;color:#e2e8f0;padding:16px;display:grid;gap:10px;";
  const title = document.createElement("h3");
  title.style.cssText = "margin:0;font-size:16px;color:#fecaca;";
  title.textContent = "Enable P2A first";
  const body = document.createElement("p");
  body.style.cssText = "margin:0;font-size:13px;line-height:1.45;color:#cbd5e1;";
  body.textContent =
    "Push to Talk requires P2A to be enabled. Turn on the P2A toggle in the world chat panel, then press P again.";
  const close = document.createElement("button");
  close.type = "button";
  close.style.cssText =
    "justify-self:end;border-radius:8px;border:1px solid rgba(148,163,184,0.45);background:rgba(30,41,59,0.95);color:#e2e8f0;padding:6px 10px;cursor:pointer;";
  close.textContent = "Got it";
  const remove = (): void => overlay.remove();
  close.addEventListener("click", remove);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      remove();
    }
  });
  card.append(title, body, close);
  overlay.append(card);
  document.body.append(overlay);
}

async function triggerProximityPushToTalk(): Promise<void> {
  const partner = registeredAgentPartnerForProximityOrNull(
    lastProximityPartnerId
  );
  if (partner === null || partner === HUMAN_VIEWER_PLAYER_ID) return;
  if (!getPreviewViewSettings().p2aEnabled) {
    showP2aRequiredModal();
    return;
  }
  if (snapshot !== null) {
    const row = listAgentRows(snapshot).find((r) => r.agentId === partner);
    if (row?.enableP2a !== "on") {
      showP2aTargetNotEnabledModal();
      return;
    }
  }
  sessionInteractionPanel?.setContext(partner);
  sessionInteractionPanel?.setMode("push_to_talk");
  sessionInteractionPanel?.scrollToBottom();
  if (mobileSidePanelControls?.isMobileViewport() === true) {
    mobileSidePanelControls.openRightPanel();
  }
  const ready = await (sessionInteractionPanel?.preparePushToTalkConnection(partner) ??
    Promise.resolve(true));
  if (!ready) {
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
  if (!inField && !e.repeat && getHumanPlayerId() !== null) {
    const playPadKey = e.key.toLowerCase();
    if (isPlayPadKeyChar(playPadKey) && tryHandlePlayPadKeyPress(playPadKey)) {
      e.preventDefault();
      return;
    }
  }
  if (inField || e.repeat) return;
  if (e.key === "Escape") {
    if (walletInventoryPanel !== null && walletInventoryPanel.isOpen()) {
      e.preventDefault();
      walletInventoryPanel.close();
      return;
    }
    const stage = stageController?.current();
    if (stage !== null && stage !== undefined && stage.id !== "overworld") {
      e.preventDefault();
      leaveCurrentEnclosedStageToPrevious();
    }
    return;
  }
  if (e.key.toLowerCase() === "w") {
    e.preventDefault();
    openWalletInventoryPanel();
    return;
  }
  if (
    e.key.toLowerCase() === "p" &&
    lastYardAmenityPadTarget !== null &&
    stageController?.current()?.id === "spaceYard"
  ) {
    e.preventDefault();
    void enterAmenityFromYardPad(lastYardAmenityPadTarget);
    return;
  }
  if (e.key.toLowerCase() === "p" && activeAmenityStage !== null) {
    const stage = activeAmenityStage;
    const buyable = stage.nearestBuyable;
    if (buyable !== null) {
      e.preventDefault();
      cycleAmenityItemAction(stage, buyable);
      return;
    }
  }
  const partner = registeredAgentPartnerForProximityOrNull(
    lastProximityPartnerId
  );
  if (partner === null || partner === HUMAN_VIEWER_PLAYER_ID) {
    if (
      e.key.toLowerCase() === "a" &&
      lastStructureProximityTarget !== null
    ) {
      e.preventDefault();
      void enterStructureSpaceFromProximity(lastStructureProximityTarget);
    }
    return;
  }
  const act = proximityKeyToAction(e.key);
  if (act === null) return;
  e.preventDefault();
  if (act === "assist" || act === "chat") {
    triggerProximityAssistOrChat(act);
    return;
  }
  if (act === "push_to_talk") {
    void triggerProximityPushToTalk();
    return;
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
const parkBackdropLayer = new Container();
const streetSignsLayer = new Container();
const worldRoot = new Container();
/**
 * The DOM element that contains the Pixi canvas. Captured by
 * `bootstrap()` so that helpers outside the bootstrap closure (e.g.
 * the amenity tooltip positioner) can convert player coordinates from
 * canvas-host space into viewport pixels via `getBoundingClientRect()`.
 */
let canvasHostRef: HTMLElement | null = null;
let stageController: StageController | null = null;
let walletHud: WalletHudHandle | null = null;
let walletInventoryPanel: WalletInventoryPanelHandle | null = null;
let walletBalanceCached: number | null = null;

async function refreshWalletHud(): Promise<void> {
  if (walletHud === null) return;
  const sid = getSid();
  const playerId = getViewerWalletPlayerId();
  if (sid === null || playerId === null) {
    // No active player yet (snapshot still loading) — show a placeholder
    // rather than a hard error so the HUD stays visible.
    walletHud.setLoading();
    return;
  }
  if (walletBalanceCached === null) {
    walletHud.setLoading();
  }
  try {
    const wallet = await fetchPlayerWallet({ playerId, sid });
    walletBalanceCached = wallet.balanceUsd;
    walletHud?.setBalance(wallet.balanceUsd);
    walletHud?.setPowerUps(wallet.powerUps);
  } catch (error) {
    const message = error instanceof Error ? error.message : "wallet fetch failed";
    walletHud?.setError(message);
  }
}

async function refreshWalletInventoryPanel(): Promise<void> {
  if (walletInventoryPanel === null) return;
  const sid = getSid();
  const playerId = getViewerWalletPlayerId();
  if (sid === null || playerId === null) {
    walletInventoryPanel.setError("Sign in to view your inventory.");
    return;
  }
  walletInventoryPanel.setLoading();
  try {
    const result = await fetchPurchases({ sid, playerId });
    walletBalanceCached = result.wallet.balanceUsd;
    walletHud?.setBalance(result.wallet.balanceUsd);
    walletHud?.setPowerUps(result.wallet.powerUps);
    walletInventoryPanel.setData({
      balanceUsd: result.wallet.balanceUsd,
      powerUps: result.wallet.powerUps,
      purchases: result.purchases,
      items: result.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "inventory fetch failed";
    walletInventoryPanel.setError(message);
  }
}

function openWalletInventoryPanel(): void {
  if (walletInventoryPanel === null) return;
  walletInventoryPanel.open();
}

const STRUCTURE_AMENITY_KIND_MAP: Record<string, "shop" | "supermarket" | "car_wash"> = {
  shop: "shop",
  supermarket: "supermarket",
  car_wash: "car_wash",
  carwash: "car_wash",
};

function deriveYardAmenitiesForSpace(spaceId: string): Array<{
  kind: "shop" | "supermarket" | "car_wash";
}> {
  if (snapshot === null) return [];
  const structs = collectStructuresForRender(snapshot);
  const kinds = new Set<"shop" | "supermarket" | "car_wash">();
  for (const st of structs) {
    if (st.spaceIds === undefined || !st.spaceIds.includes(spaceId)) continue;
    const candidates = [st.primaryAmenity, ...(st.amenities ?? [])];
    for (const raw of candidates) {
      if (raw === undefined) continue;
      const mapped = STRUCTURE_AMENITY_KIND_MAP[raw];
      if (mapped !== undefined) kinds.add(mapped);
    }
  }
  return Array.from(kinds).slice(0, 3).map((kind) => ({ kind }));
}

let activeYardStage: SpaceYardStageHandle | null = null;
let activeYardSpaceId: string | null = null;
let lastYardAmenityPadTarget: YardAmenityPadPosition | null = null;

type AmenityKind = "shop" | "supermarket" | "car_wash";

const AMENITY_DISPLAY_LABEL: Record<AmenityKind, string> = {
  shop: "Shop",
  supermarket: "Supermarket",
  car_wash: "Car Wash",
};

const AMENITY_STAGE_BOUNDS: Record<AmenityKind, AmenityStageBounds> = {
  shop: SHOP_BOUNDS,
  supermarket: SUPERMARKET_BOUNDS,
  car_wash: CAR_WASH_BOUNDS,
};

type ActiveAmenityStage = {
  kind: AmenityKind;
  spaceId: string;
  handle:
    | AmenityShopStageHandle
    | AmenitySupermarketStageHandle
    | AmenityCarWashStageHandle;
  bounds: AmenityStageBounds;
  cellScale: number;
  spawn: { x: number; y: number };
  exitDoorAnchor: { x: number; y: number };
  playerLayer: Container;
  heroGraphic: Graphics;
  offsetX: number;
  offsetY: number;
  nearestBuyable: AmenityBuyable | null;
  tooltipOpenForItemId: string | null;
};

let activeAmenityStage: ActiveAmenityStage | null = null;
let amenityItemTooltip: ItemTooltipHandle | null = null;

/**
 * Trigger `stageController.back()` and clear the active enclosed-stage
 * reference once the transition resolves. Centralised so both the Esc path
 * and the exit-door proximity path drop `activeYardStage` /
 * `activeAmenityStage` at the right moment — never during the inbound
 * transition (which used to break the per-stage tick).
 */
function leaveCurrentEnclosedStageToPrevious(): void {
  const controller = stageController;
  if (controller === null) return;
  const wasAmenity = activeAmenityStage !== null;
  void controller
    .back()
    .then(() => {
      if (wasAmenity) {
        activeAmenityStage = null;
        amenityItemTooltip?.hide();
      } else {
        activeYardStage = null;
        activeYardSpaceId = null;
      }
    })
    .catch(() => {});
}

const leaveYardStageToPrevious = leaveCurrentEnclosedStageToPrevious;
const yardPlayerState: {
  pos: { x: number; y: number };
  facing: "left" | "right";
  walkPhase: number;
  isMoving: boolean;
} = {
  pos: yardSpawnPosition(),
  facing: "right",
  walkPhase: 0,
  isMoving: false,
};
let yardExitDebounceMs = 0;

const YARD_PLAYER_SPEED_CELLS_PER_SEC = 3.2;

function tickYardPlayer(dtSec: number): void {
  const stage = activeYardStage;
  if (stage === null) return;
  const direction = nextEnclosedStageInputDirection({
    joystickEnabled: getPreviewViewSettings().joystickEnabled,
    joystickVector: getJoystickVector(),
    arrowKeys,
  });
  const { dx, dy, source } = direction;
  const isMoving = source !== "idle";
  if (isMoving) {
    const step = YARD_PLAYER_SPEED_CELLS_PER_SEC * dtSec;
    yardPlayerState.pos.x = yardPlayerState.pos.x + dx * step;
    yardPlayerState.pos.y = yardPlayerState.pos.y + dy * step;
    yardPlayerState.pos = clampYardPosition(yardPlayerState.pos);
    if (dx !== 0) yardPlayerState.facing = dx > 0 ? "right" : "left";
    yardPlayerState.walkPhase = (yardPlayerState.walkPhase + dtSec * 4) % 1;
  } else {
    yardPlayerState.walkPhase = 0;
  }
  yardPlayerState.isMoving = isMoving;
  const anim: YardPlayerAnim = {
    facing: yardPlayerState.facing,
    walkPhase: yardPlayerState.walkPhase,
    isMoving,
  };
  stage.setPlayerYardPosition(yardPlayerState.pos, anim);

  lastYardAmenityPadTarget = findNearestYardAmenityPad({
    player: yardPlayerState.pos,
    pads: stage.amenityPads,
    radius: YARD_AMENITY_PROXIMITY_RADIUS_WORLD,
  });

  if (yardExitDebounceMs > 0) {
    yardExitDebounceMs = Math.max(0, yardExitDebounceMs - dtSec * 1000);
    return;
  }
  const door = stage.exitDoorAnchor;
  const distToDoor = Math.hypot(
    yardPlayerState.pos.x - door.x,
    yardPlayerState.pos.y - door.y
  );
  if (distToDoor <= EXIT_DOOR_PROXIMITY_RADIUS_WORLD) {
    yardExitDebounceMs = 400;
    lastYardAmenityPadTarget = null;
    leaveCurrentEnclosedStageToPrevious();
  }
}

const amenityPlayerState: {
  pos: { x: number; y: number };
  facing: "left" | "right";
  walkPhase: number;
  isMoving: boolean;
} = {
  pos: { x: 0, y: 0 },
  facing: "right",
  walkPhase: 0,
  isMoving: false,
};
let amenityExitDebounceMs = 0;

const AMENITY_PLAYER_SPEED_CELLS_PER_SEC = 3.2;
const AMENITY_HEADER_BAND_PX = 56;

function amenitySpawnInside(bounds: AmenityStageBounds): { x: number; y: number } {
  // Spawn near the bottom-centre, away from the (0,0) exit door.
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: bounds.maxY - 1,
  };
}

function tickAmenityPlayer(dtSec: number): void {
  const stage = activeAmenityStage;
  if (stage === null) return;
  const direction = nextEnclosedStageInputDirection({
    joystickEnabled: getPreviewViewSettings().joystickEnabled,
    joystickVector: getJoystickVector(),
    arrowKeys,
  });
  const { dx, dy, source } = direction;
  const isMoving = source !== "idle";
  if (isMoving) {
    const step = AMENITY_PLAYER_SPEED_CELLS_PER_SEC * dtSec;
    amenityPlayerState.pos.x = amenityPlayerState.pos.x + dx * step;
    amenityPlayerState.pos.y = amenityPlayerState.pos.y + dy * step;
    amenityPlayerState.pos = stage.handle.clampPosition(amenityPlayerState.pos);
    if (dx !== 0) amenityPlayerState.facing = dx > 0 ? "right" : "left";
    amenityPlayerState.walkPhase =
      (amenityPlayerState.walkPhase + dtSec * 4) % 1;
  } else {
    amenityPlayerState.walkPhase = 0;
  }
  amenityPlayerState.isMoving = isMoving;
  renderAmenityPlayer(stage);
  refreshNearestAmenityBuyable(stage);

  if (amenityExitDebounceMs > 0) {
    amenityExitDebounceMs = Math.max(0, amenityExitDebounceMs - dtSec * 1000);
    return;
  }
  const door = stage.exitDoorAnchor;
  const distToDoor = Math.hypot(
    amenityPlayerState.pos.x - door.x,
    amenityPlayerState.pos.y - door.y
  );
  if (distToDoor <= EXIT_DOOR_PROXIMITY_RADIUS_WORLD) {
    amenityExitDebounceMs = 400;
    leaveCurrentEnclosedStageToPrevious();
  }
}

function renderAmenityPlayer(stage: ActiveAmenityStage): void {
  stage.playerLayer.position.set(
    amenityPlayerState.pos.x * stage.cellScale,
    amenityPlayerState.pos.y * stage.cellScale
  );
  const playerScale = Math.max(0.5, Math.min(1.1, stage.cellScale / 48));
  drawPlatformHero(stage.heroGraphic, {
    scale: playerScale,
    facing: amenityPlayerState.facing,
    walkPhase: amenityPlayerState.walkPhase,
    isMoving: amenityPlayerState.isMoving,
  });
}

async function enterAmenityFromYardPad(
  target: YardAmenityPadPosition
): Promise<void> {
  if (stageController === null) return;
  if (activeAmenityStage !== null) return;
  const current = stageController.current();
  if (current === null || current.id !== "spaceYard") return;

  const kind = target.kind as AmenityKind;
  const bounds = AMENITY_STAGE_BOUNDS[kind];
  const availableHeight = Math.max(0, VIEW_H - AMENITY_HEADER_BAND_PX);
  const boundsW = Math.max(1, bounds.maxX - bounds.minX);
  const boundsH = Math.max(1, bounds.maxY - bounds.minY);
  const cellScale = Math.max(
    16,
    Math.min(VIEW_W / boundsW, availableHeight / boundsH)
  );
  const stageW = boundsW * cellScale;
  const stageH = boundsH * cellScale;
  const offsetX = (VIEW_W - stageW) / 2;
  const offsetY = AMENITY_HEADER_BAND_PX + (availableHeight - stageH) / 2;

  const resolvedContent =
    activeYardSpaceId !== null
      ? resolveAmenityContent({
          snapshot,
          spaceId: activeYardSpaceId,
          kind,
        })
      : { shopItems: [], supermarketItems: [], carWashCars: [] };

  let handle:
    | AmenityShopStageHandle
    | AmenitySupermarketStageHandle
    | AmenityCarWashStageHandle;
  if (kind === "shop") {
    handle = buildAmenityShopStage({
      cellScale,
      items: resolvedContent.shopItems,
    });
  } else if (kind === "supermarket") {
    handle = buildAmenitySupermarketStage({
      cellScale,
      items: resolvedContent.supermarketItems,
    });
  } else {
    handle = buildAmenityCarWashStage({
      cellScale,
      cars: resolvedContent.carWashCars,
    });
  }
  // The amenity stages return `root` typed as the minimal `StageRoot`
  // contract for testability, but the live object is a Pixi `Container`.
  const rootContainer = handle.root as unknown as Container;
  rootContainer.position.set(offsetX, offsetY);

  const header = new Graphics();
  header
    .rect(0, 0, VIEW_W, AMENITY_HEADER_BAND_PX)
    .fill({ color: 0x111827 });
  header
    .rect(0, AMENITY_HEADER_BAND_PX - 2, VIEW_W, 2)
    .fill({ color: 0x374151, alpha: 0.7 });
  header.position.set(-offsetX, -offsetY);
  rootContainer.addChild(header);

  const headline = new Text({
    text: AMENITY_DISPLAY_LABEL[kind],
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 22,
      fontWeight: "700",
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2, alpha: 0.45 },
    },
  });
  headline.anchor.set(0.5, 0.5);
  headline.position.set(VIEW_W / 2 - offsetX, AMENITY_HEADER_BAND_PX / 2 - offsetY);
  rootContainer.addChild(headline);

  const playerLayer = new Container();
  const heroGraphic = new Graphics();
  playerLayer.addChild(heroGraphic);
  rootContainer.addChild(playerLayer);

  const spawn = amenitySpawnInside(bounds);
  amenityPlayerState.pos = handle.clampPosition({ x: spawn.x, y: spawn.y });
  amenityPlayerState.facing = yardPlayerState.facing;
  amenityPlayerState.walkPhase = 0;
  amenityPlayerState.isMoving = false;
  amenityExitDebounceMs = 250;

  activeAmenityStage = {
    kind,
    spaceId: activeYardSpaceId ?? "",
    handle,
    bounds,
    cellScale,
    spawn,
    exitDoorAnchor: handle.exitDoorAnchor,
    playerLayer,
    heroGraphic,
    offsetX,
    offsetY,
    nearestBuyable: null,
    tooltipOpenForItemId: null,
  };
  lastYardAmenityPadTarget = null;
  renderAmenityPlayer(activeAmenityStage);

  try {
    await stageController.enter(handle);
    deepLogText("stage:enter:amenity", { kind });
  } catch (error) {
    console.warn("[agent-play:world] enter amenity failed", error);
    activeAmenityStage = null;
  }
}

async function enterStructureSpaceFromProximity(
  target: StructureProximityTarget
): Promise<void> {
  if (stageController === null) return;
  const current = stageController.current();
  if (current !== null && current.id !== "overworld") return;
  try {
    const amenities = deriveYardAmenitiesForSpace(target.spaceId);
    const yard = buildSpaceYardStage({
      spaceName: target.label ?? target.spaceId,
      amenities,
      viewportSize: { width: VIEW_W, height: VIEW_H },
      palette,
    });
    activeYardStage = yard;
    activeYardSpaceId = target.spaceId;
    yardPlayerState.pos = yardSpawnPosition();
    const overworldFacing =
      getHumanPlayerId() !== null
        ? facingByPlayer.get(getHumanPlayerId() as string) ?? "right"
        : "right";
    yardPlayerState.facing = overworldFacing;
    yardPlayerState.walkPhase = 0;
    yardPlayerState.isMoving = false;
    yard.setPlayerYardPosition(yardPlayerState.pos, {
      facing: yardPlayerState.facing,
      walkPhase: 0,
      isMoving: false,
    });
    yardExitDebounceMs = 250;
    await stageController.enter(yard);
    void refreshWalletHud();
    deepLogText("stage:enter:space", {
      spaceId: target.spaceId,
      amenityCount: amenities.length,
    });
  } catch (error) {
    console.warn("[agent-play:world] enter space failed", error);
  }
}

let cameraX = 0;
let cameraY = 0;

const structureNodes = new Map<string, StructureVisual>();
const agentNodes = new Map<string, AgentVisual>();

let refreshPreviewChat: () => void = () => {};

let agentChatOverlays: ReturnType<typeof createPreviewAgentChatOverlays> | null =
  null;
let globalChatRoom: ReturnType<typeof createPreviewGlobalChatRoom> | null = null;
let spacesCtaPanel: ReturnType<typeof createPreviewSpacesCtaPanel> | null = null;
let activeIntercomAddress: string | null = null;
let sessionInteractionPanel:
  | ReturnType<typeof createPreviewSessionInteractionPanel>
  | null = null;
let mobileSidePanelControls:
  | ReturnType<typeof attachMobileSidePanelControls>
  | null = null;

let pixiHandle: PixiPreviewHandle | null = null;
let sceneRootContainer: Container | null = null;
let crowdLayerContainer: Container | null = null;
let skyDecor: ReturnType<typeof createSkyDecorLayer> | null = null;
let debugPanelUpdate: (() => void) | null = null;
let debugPanelSyncCompanionLayout: (() => void) | null = null;
let debugMountEl: HTMLElement | null = null;
let joystickHandle: ReturnType<typeof createPreviewDebugJoystick> | null = null;
let playPadKeyBuffer = "";
let playPadKeySequenceTimer: ReturnType<typeof setTimeout> | null = null;

function clearPlayPadKeySequenceTimer(): void {
  if (playPadKeySequenceTimer !== null) {
    clearTimeout(playPadKeySequenceTimer);
    playPadKeySequenceTimer = null;
  }
}

function resetPlayPadKeyBuffer(): void {
  clearPlayPadKeySequenceTimer();
  playPadKeyBuffer = "";
}

function tryHandlePlayPadKeyPress(char: string): boolean {
  if (!getPreviewViewSettings().joystickEnabled || joystickHandle === null) {
    return false;
  }
  playPadKeyBuffer += char;
  clearPlayPadKeySequenceTimer();

  if (char === "n") {
    const attachInput = resolvePlayPadInputFromKeyBuffer("n");
    playPadKeyBuffer = "";
    if (attachInput === null) return false;
    return joystickHandle.handlePlayPadInput(attachInput);
  }

  if (playPadKeyBuffer.length >= 2) {
    const twoChar = playPadKeyBuffer.slice(-2);
    if (isPlayPadTwoLetterCombo(twoChar)) {
      const comboInput = resolvePlayPadInputFromKeyBuffer(twoChar);
      playPadKeyBuffer = "";
      if (comboInput === null) return false;
      return joystickHandle.handlePlayPadInput(comboInput);
    }
  }

  const buffered = playPadKeyBuffer;
  playPadKeySequenceTimer = setTimeout(() => {
    playPadKeySequenceTimer = null;
    if (playPadKeyBuffer !== buffered) return;
    const input = resolvePlayPadInputFromKeyBuffer(playPadKeyBuffer);
    playPadKeyBuffer = "";
    if (input !== null) {
      joystickHandle?.handlePlayPadInput(input);
    }
  }, PLAY_PAD_SEQUENCE_WINDOW_MS);

  return true;
}
let previewBootstrapStarted = false;
let previewBootstrapLock: Promise<void> | null = null;

/**
 * Resolves a stable display name for chat labels (“You” for the human viewer).
 * @remarks **Callers:** chat overlays, {@link pushInteractionToChat}. **Callees:** none.
 */
function playerDisplayName(playerId: string): string {
  if (playerId === HUMAN_VIEWER_PLAYER_ID) return "You";
  if (snapshot === null) return playerId;
  const human = listHumanRows(snapshot).find((h) => h.id === playerId);
  if (human !== undefined) {
    return human.name;
  }
  return (
    listAgentRows(snapshot).find((p) => p.agentId === playerId)?.name ??
    playerId
  );
}

function globalSenderName(playerId: string): string {
  const mainNodeId = getMainNodeIdForIntercom();
  if (mainNodeId !== null && playerId === mainNodeId) {
    return "You";
  }
  if (snapshot !== null) {
    const row = listAgentRows(snapshot).find((p) => p.agentId === playerId);
    if (row !== undefined) {
      return row.name;
    }
  }
  return playerId.slice(0, 8);
}

function isValidIntercomAddress(value: string | null): value is string {
  if (value === null) return false;
  const trimmed = value.trim();
  const delimiterIndex = trimmed.indexOf("://");
  if (delimiterIndex <= 0) return false;
  const protocol = trimmed.slice(0, delimiterIndex).trim().toLowerCase();
  const id = trimmed.slice(delimiterIndex + 3).trim();
  return protocol.endsWith("-intercom") && id.length > 0;
}

function resolvePersonalIntercomAddress(): string | null {
  const mainNodeId = getMainNodeIdForIntercom();
  if (mainNodeId === null || mainNodeId.trim().length === 0) {
    return null;
  }
  return buildIntercomAddress(mainNodeId);
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
      enableP2a: p.enableP2a,
      realtimeInstructions: p.realtimeInstructions,
      realtimeWebrtc: p.realtimeWebrtc,
    }))
  );
  sessionInteractionPanel?.refresh();
  refreshPreviewChat();
}

function collectStructuresForRender(s: Snapshot): Structure[] {
  const out: Structure[] = [];
  for (const o of s.worldMap.occupants) {
    if (o.kind === "mcp") {
      out.push({
        id: `mcp:${o.id}`,
        kind: "tool",
        x: o.x,
        y: o.y,
        label: o.name,
      });
    } else if (o.kind === "structure") {
      out.push({
        id: o.id,
        kind: "structure",
        x: o.x,
        y: o.y,
        label: o.name,
        name: o.name,
        primaryAmenity: o.primaryAmenity,
        amenities: o.amenities,
        spaceIds: o.spaceIds,
      });
    }
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

function getAgentHeroAnchorLocal(
  playerId: string,
  wpos: { x: number; y: number },
  box: number
): { x: number; y: number } {
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
  const { x: sx, y: sy } = worldToWorldRootLocal(wx, wy);
  return { x: sx + box * 0.3, y: sy + box * 0.55 };
}

function getAgentHeroAnchorScreen(
  playerId: string,
  wpos: { x: number; y: number },
  box: number
): { cx: number; cy: number } {
  const local = getAgentHeroAnchorLocal(playerId, wpos, box);
  const p = worldRootLocalToCanvas(local.x, local.y);
  return { cx: p.x, cy: p.y };
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

function clearRemoteGeographyPresence(): void {
  for (const id of remoteGeographyHumanIds) {
    playerWorldPos.delete(id);
    waypointQueues.delete(id);
    walkPhaseByPlayer.delete(id);
    facingByPlayer.delete(id);
    movingByPlayer.delete(id);
    lastTickWorldPos.delete(id);
  }
  remoteGeographyHumanIds.clear();
}

function applyWorldGeographyOccupants(snap: Snapshot): void {
  if (!getPreviewViewSettings().worldGeographyEnabled) {
    return;
  }
  const wb = getWorldBoundsForClamp();
  const localId = getLocalGeographyHumanId();
  const seen = new Set<string>();
  for (const h of listHumanRows(snap)) {
    if (localId !== null && h.id === localId) {
      continue;
    }
    seen.add(h.id);
    remoteGeographyHumanIds.add(h.id);
    const clamped =
      wb !== null
        ? clampWorldPosition({ x: h.x, y: h.y }, wb)
        : { x: h.x, y: h.y };
    playerWorldPos.set(h.id, clamped);
    if (h.facing === "left" || h.facing === "right") {
      facingByPlayer.set(h.id, h.facing);
    }
    if (typeof h.isMoving === "boolean") {
      movingByPlayer.set(h.id, h.isMoving);
    }
  }
  for (const id of [...remoteGeographyHumanIds]) {
    if (!seen.has(id)) {
      remoteGeographyHumanIds.delete(id);
      playerWorldPos.delete(id);
      waypointQueues.delete(id);
      walkPhaseByPlayer.delete(id);
      facingByPlayer.delete(id);
      movingByPlayer.delete(id);
      lastTickWorldPos.delete(id);
    }
  }
}

async function publishLocalGeographyPresence(): Promise<void> {
  if (!getPreviewViewSettings().worldGeographyEnabled) {
    return;
  }
  const sid = getPreviewSessionIdSync();
  const humanId = getLocalGeographyHumanId();
  if (sid === null || humanId === null) {
    return;
  }
  const pos = playerWorldPos.get(HUMAN_VIEWER_PLAYER_ID);
  if (pos === undefined) {
    return;
  }
  const displayName =
    humanId.length > 16 ? `${humanId.slice(0, 12)}…` : humanId;
  await postGeographyPresence({
    apiBase: API_BASE,
    sid,
    humanId,
    name: displayName,
    x: pos.x,
    y: pos.y,
    facing: facingByPlayer.get(HUMAN_VIEWER_PLAYER_ID) ?? "right",
    isMoving: movingByPlayer.get(HUMAN_VIEWER_PLAYER_ID) ?? false,
  });
}

async function syncWorldGeographyEnabled(enabled: boolean): Promise<void> {
  const sid = getPreviewSessionIdSync();
  const humanId = getLocalGeographyHumanId();
  if (!enabled) {
    clearRemoteGeographyPresence();
    if (sid !== null && humanId !== null) {
      await postGeographyLeave({ apiBase: API_BASE, sid, humanId });
    }
    return;
  }
  await publishLocalGeographyPresence();
}

function maybePublishGeographyPresence(nowMs: number): void {
  if (!getPreviewViewSettings().worldGeographyEnabled) {
    return;
  }
  if (nowMs - geographyLastPublishMs < GEOGRAPHY_PUBLISH_INTERVAL_MS) {
    return;
  }
  geographyLastPublishMs = nowMs;
  void publishLocalGeographyPresence();
}

function ingestSnapshot(snap: Snapshot): void {
  snapshot = snap;
  deepLogObject("ingestSnapshot", {
    sid: snap.sid,
    occupantCount: snap.worldMap.occupants.length,
    bounds: snap.worldMap.bounds,
  });
  const b = snapshot.worldMap.bounds;
  if (b !== undefined) applyBounds(b);
  else {
    applyBounds(MINIMUM_PLAY_WORLD_BOUNDS);
  }
  paintStreetSigns();
  const wbSpawn = getWorldBoundsForClamp();
  const humanSpawn =
    wbSpawn !== null ? defaultHumanSpawnInWorld(wbSpawn) : { x: 0, y: 0 };
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
  applyWorldGeographyOccupants(snapshot);
  hydrateChatFromSnapshot(snapshot);
  refreshActiveAmenityFromSnapshot();
  void refreshWalletHud();
}

function refreshActiveAmenityFromSnapshot(): void {
  const stage = activeAmenityStage;
  if (stage === null || activeYardSpaceId === null) return;
  const content = resolveAmenityContent({
    snapshot,
    spaceId: activeYardSpaceId,
    kind: stage.kind,
  });
  if (stage.kind === "shop") {
    (stage.handle as AmenityShopStageHandle).refresh(content.shopItems);
  } else if (stage.kind === "supermarket") {
    (stage.handle as AmenitySupermarketStageHandle).refresh(
      content.supermarketItems
    );
  } else {
    (stage.handle as AmenityCarWashStageHandle).refresh(content.carWashCars);
  }
  // If the tooltip is open and the underlying item changed (e.g. sold via
  // fanout), re-render with the latest model.
  if (stage.tooltipOpenForItemId !== null) {
    const refreshed = computeNearestAmenityBuyable(stage);
    if (
      refreshed !== null &&
      refreshed.itemRef.id === stage.tooltipOpenForItemId
    ) {
      stage.nearestBuyable = refreshed;
      showAmenityItemTooltip(stage, refreshed);
    }
  }
}

function computeNearestAmenityBuyable(
  stage: ActiveAmenityStage
): AmenityBuyable | null {
  return resolveNearestAmenityBuyable({
    kind: stage.kind,
    findShop: () =>
      stage.kind === "shop"
        ? (stage.handle as AmenityShopStageHandle).findNearbyItem(
            amenityPlayerState.pos
          )
        : null,
    findSupermarket: () =>
      stage.kind === "supermarket"
        ? (stage.handle as AmenitySupermarketStageHandle).findNearbyItem(
            amenityPlayerState.pos
          )
        : null,
    findCar: () =>
      stage.kind === "car_wash"
        ? (stage.handle as AmenityCarWashStageHandle).findNearbyCar(
            amenityPlayerState.pos
          )
        : null,
  });
}

function refreshNearestAmenityBuyable(stage: ActiveAmenityStage): void {
  const prevId = stage.nearestBuyable?.itemRef.id ?? null;
  const next = computeNearestAmenityBuyable(stage);
  stage.nearestBuyable = next;
  const nextId = next?.itemRef.id ?? null;
  if (prevId !== nextId) {
    proximityTouchPadHandle?.refresh();
  }
  // If the tooltip was opened for an item we have walked away from, hide it.
  if (
    stage.tooltipOpenForItemId !== null &&
    (next === null || next.itemRef.id !== stage.tooltipOpenForItemId)
  ) {
    amenityItemTooltip?.hide();
    stage.tooltipOpenForItemId = null;
  }
}

/**
 * Single entry point for the `P` key / `P` touch-pad button while
 * standing next to an amenity item. Implements the three-step cycle:
 *
 * 1. tooltip is not showing this item → show it.
 * 2. tooltip is showing this item, item is available, no purchase
 *    in flight → execute the purchase (same effect as clicking Buy).
 * 3. tooltip is showing this item, purchase in flight → no-op.
 *
 * A previous purchase failure leaves the tooltip in a not-busy state
 * with an inline error message, so the next press lands in case 2 and
 * retries automatically. Sold items only enter case 1; there is no
 * Buy action for them.
 *
 * @remarks **Callers:** {@link onDocumentKeyDown}, the touch-pad
 *   `onPushToTalk` callback. **Callees:** {@link showAmenityItemTooltip},
 *   {@link buyAmenityItem}.
 */
function cycleAmenityItemAction(
  stage: ActiveAmenityStage,
  buyable: AmenityBuyable
): void {
  const tooltip = amenityItemTooltip;
  if (tooltip === null) return;
  const tooltipShowingThisItem =
    tooltip.isOpen() && stage.tooltipOpenForItemId === buyable.itemRef.id;
  if (!tooltipShowingThisItem) {
    showAmenityItemTooltip(stage, buyable);
    return;
  }
  if (buyable.tooltipModel.sale.status !== "available") return;
  if (tooltip.isBusy()) return;
  void buyAmenityItem(stage, buyable);
}

function showAmenityItemTooltip(
  stage: ActiveAmenityStage,
  buyable: AmenityBuyable
): void {
  if (amenityItemTooltip === null) return;
  stage.tooltipOpenForItemId = buyable.itemRef.id;
  amenityItemTooltip.show({
    model: buyable.tooltipModel,
    onBuy: () => {
      void buyAmenityItem(stage, buyable);
    },
  });
  positionAmenityItemTooltip(stage);
}

function positionAmenityItemTooltip(stage: ActiveAmenityStage): void {
  if (amenityItemTooltip === null) return;
  const host = canvasHostRef;
  // Player position in canvas-host px (pre-transform / "logical" coords).
  const localX = stage.offsetX + amenityPlayerState.pos.x * stage.cellScale;
  const localY = stage.offsetY + amenityPlayerState.pos.y * stage.cellScale;
  if (host === null) {
    // Fallback: behave as before. Should not happen at runtime because
    // canvasHostRef is captured during bootstrap before any amenity
    // stage can mount.
    amenityItemTooltip.root.style.left = `${String(Math.round(localX - 140))}px`;
    amenityItemTooltip.root.style.top = `${String(Math.round(localY - 180))}px`;
    return;
  }
  // Convert canvas-host px → viewport px via the rendered bounding
  // box. `getBoundingClientRect()` accounts for the CSS `transform`
  // applied by `syncWorldScale`.
  const hostRect = host.getBoundingClientRect();
  const scaleX = hostRect.width / VIEW_W;
  const scaleY = hostRect.height / VIEW_H;
  const anchorX = hostRect.left + localX * scaleX;
  // Anchor slightly above the player's centre so the default "above"
  // placement clears the sprite.
  const anchorY = hostRect.top + (localY - 32) * scaleY;
  amenityItemTooltip.position({ x: anchorX, y: anchorY });
}

async function buyAmenityItem(
  stage: ActiveAmenityStage,
  buyable: AmenityBuyable
): Promise<void> {
  const tooltip = amenityItemTooltip;
  if (tooltip === null) return;
  const sid = getSid();
  const playerId = getViewerWalletPlayerId();
  if (sid === null || playerId === null) {
    tooltip.setError("sign in to play");
    return;
  }
  tooltip.setBusy();
  const result = await executePurchase({
    sid,
    playerId,
    spaceId: stage.spaceId,
    amenityKind: stage.kind,
    itemRef: buyable.itemRef,
  });
  if (result.ok) {
    walletBalanceCached = result.wallet.balanceUsd;
    walletHud?.setBalance(result.wallet.balanceUsd);
    walletHud?.setPowerUps(result.wallet.powerUps);
    if (walletInventoryPanel !== null && walletInventoryPanel.isOpen()) {
      void refreshWalletInventoryPanel();
    }
    tooltip.hide();
    stage.tooltipOpenForItemId = null;
    return;
  }
  if (result.error === "INSUFFICIENT_FUNDS") {
    tooltip.setError("Insufficient funds");
  } else if (result.error === "ITEM_ALREADY_SOLD") {
    tooltip.setError("Already sold");
  } else {
    tooltip.setError(result.message);
  }
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
  es.addEventListener(WORLD_GEOGRAPHY_SSE, (ev) => {
    if (!getPreviewViewSettings().worldGeographyEnabled) {
      return;
    }
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
    if (
      typeof data === "object" &&
      data !== null &&
      "channelKey" in data &&
      "requestId" in data &&
      "fromPlayerId" in data &&
      "ts" in data
    ) {
      const row = data as {
        channelKey?: unknown;
        requestId?: unknown;
        fromPlayerId?: unknown;
        intercomAddress?: unknown;
        message?: unknown;
        result?: unknown;
        status?: unknown;
        ts?: unknown;
      };
      if (typeof row.intercomAddress === "string" && isValidIntercomAddress(row.intercomAddress)) {
        activeIntercomAddress = row.intercomAddress;
        globalChatRoom?.refreshP2a();
      }
      if (
        row.channelKey === WORLD_GLOBAL_CHAT_CHANNEL &&
        typeof row.requestId === "string" &&
        typeof row.fromPlayerId === "string" &&
        typeof row.ts === "string"
      ) {
        const resultRecord =
          typeof row.result === "object" && row.result !== null
            ? (row.result as Record<string, unknown>)
            : undefined;
        const messageKindRaw = resultRecord?.messageKind;
        const messageKind =
          messageKindRaw === "audio" || messageKindRaw === "media"
            ? messageKindRaw
            : "text";
        const audio =
          typeof resultRecord?.audio === "object" && resultRecord.audio !== null
            ? (resultRecord.audio as {
                encoding?: string;
                dataBase64?: string;
                durationMs?: number;
              })
            : undefined;
        const media =
          typeof resultRecord?.media === "object" && resultRecord.media !== null
            ? (resultRecord.media as {
                mediaType?: string;
                url: string;
                title?: string;
              })
            : undefined;
        globalChatRoom?.appendFromIntercomEvent({
          seq:
            typeof resultRecord?.seq === "number"
              ? (resultRecord.seq ?? Number.MAX_SAFE_INTEGER)
              : Number.MAX_SAFE_INTEGER,
          requestId: row.requestId,
          fromPlayerId: row.fromPlayerId,
          message: typeof row.message === "string" ? row.message : "",
          messageKind,
          audio,
          media,
          ts: row.ts,
          totalCount:
            typeof resultRecord?.totalCount === "number"
              ? (resultRecord.totalCount ?? undefined)
              : undefined,
        });
        return;
      }
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

function amenityPaletteForStructure(amenity: string): AmenityBuildingPalette {
  if (amenity === "supermarket") {
    return {
      facade: 0xe2e8f0,
      roof: 0x1d4ed8,
      trim: 0x0f172a,
      accent: 0xf97316,
      glass: 0x38bdf8,
    };
  }
  if (amenity === "car_wash") {
    return {
      facade: 0x64748b,
      roof: 0x0ea5e9,
      trim: 0xf8fafc,
      accent: 0x22d3ee,
    };
  }
  return {
    facade: 0xd6d3d1,
    roof: 0x92400e,
    trim: 0x1c1917,
    accent: 0xf59e0b,
    glass: 0xa8a29e,
  };
}

function compoundStructureGroupKey(st: Structure): string {
  if (st.kind !== "structure") {
    return st.id;
  }
  if (st.spaceIds !== undefined && st.spaceIds.length > 0) {
    return `compound:${[...st.spaceIds].sort().join("|")}`;
  }
  return `compound:solo:${st.id}`;
}

function makeCaptionText(): Text {
  return new Text({
    text: "",
    style: {
      fontFamily: "ui-monospace, monospace",
      fontSize: 11,
      fontWeight: "600",
      fill: cssColorToPixi(palette.text),
      wordWrap: true,
      wordWrapWidth: 200,
    },
  });
}

function destroyStructureVisual(n: StructureVisual): void {
  structureLayer.removeChild(n.root);
  structureLayer.removeChild(n.caption);
  n.root.destroy({ children: true });
  n.caption.destroy();
}

function syncStructureNodes(structs: Structure[]): void {
  const theme = getActiveSceneTheme();
  const alive = new Set<string>();
  const compoundGroups = new Map<string, Structure[]>();
  const standalone: Structure[] = [];

  for (const st of structs) {
    if (st.kind === "structure") {
      const ck = compoundStructureGroupKey(st);
      alive.add(ck);
      const arr = compoundGroups.get(ck) ?? [];
      arr.push(st);
      compoundGroups.set(ck, arr);
    } else {
      alive.add(st.id);
      standalone.push(st);
    }
  }

  for (const id of structureNodes.keys()) {
    if (!alive.has(id)) {
      const n = structureNodes.get(id);
      if (n !== undefined) {
        destroyStructureVisual(n);
      }
      structureNodes.delete(id);
    }
  }

  const box = Math.max(16, Math.min(40, cellScale * 0.85));
  const buildingBox = box * 1.12;

  for (const [compoundKey, group] of compoundGroups) {
    let n = structureNodes.get(compoundKey);
    if (n === undefined) {
      const root = new Container();
      const cap = makeCaptionText();
      n = { root, caption: cap };
      structureNodes.set(compoundKey, n);
      structureLayer.addChild(root);
      structureLayer.addChild(cap);
    }
    n.root.removeChildren();
    const centroidX =
      group.reduce((sum, st) => sum + st.x, 0) / group.length;
    const centroidY =
      group.reduce((sum, st) => sum + st.y, 0) / group.length;
    const { x: cx, y: cy } = worldToWorldRootLocal(centroidX, centroidY);

    const sorted = [...group].sort((a, b) =>
      (a.primaryAmenity ?? "").localeCompare(b.primaryAmenity ?? "")
    );
    const amenity = representativePrimaryAmenityForCompound(sorted);
    const pal = amenityPaletteForStructure(amenity);
    const buildingG = new Graphics({ roundPixels: true });
    if (amenity === "supermarket") {
      drawSupermarketStructure(buildingG, buildingBox, pal);
    } else if (amenity === "car_wash") {
      drawCarWashStructure(buildingG, buildingBox, pal);
    } else {
      drawShopStructure(buildingG, buildingBox, pal);
    }
    buildingG.position.set(cx - buildingBox * 0.42, cy - buildingBox * 0.48);
    n.root.addChild(buildingG);

    const title = (sorted[0]?.label ?? sorted[0]?.name ?? "Space").slice(0, 28);
    const amenityTotal = countAmenitiesInSpaceCompound(sorted);
    const amenityLine =
      amenityTotal === 1 ? "1 amenity" : `${String(amenityTotal)} amenities`;
    n.caption.text = `${title}\n${amenityLine}`;
    n.caption.position.set(cx - n.caption.width / 2, cy - buildingBox * 0.92);
  }

  for (const st of standalone) {
    let n = structureNodes.get(st.id);
    if (n === undefined) {
      const root = new Container();
      const cap = makeCaptionText();
      n = { root, caption: cap };
      structureNodes.set(st.id, n);
      structureLayer.addChild(root);
      structureLayer.addChild(cap);
    }
    n.root.removeChildren();
    const boxG = new Graphics({ roundPixels: true });
    n.root.addChild(boxG);
    const { x: sx, y: sy } = worldToWorldRootLocal(st.x, st.y);
    const isMcpStore = st.id.startsWith("mcp:");
    if (st.kind === "home") {
      drawHomeStructure(boxG, box, theme.house);
      boxG.position.set(sx, sy);
      n.caption.text = (st.label ?? "Home").slice(0, 24);
      n.caption.position.set(sx - n.caption.width / 2, sy - box * 1.15);
    } else if (isMcpStore) {
      const storePal = mcpStorePalette(palette);
      const storeBox = box * 1.12;
      drawMcpStore(boxG, storeBox, storePal);
      boxG.position.set(sx - storeBox * 0.42, sy - storeBox * 0.48);
      n.caption.text = (st.label ?? "Store").slice(0, 22);
      n.caption.position.set(sx - n.caption.width / 2, sy - storeBox * 0.92);
    } else {
      const stallPal = vendorStallPalette(palette);
      drawVendorStall(boxG, box, stallPal);
      boxG.position.set(sx - box * 0.38, sy - box * 0.42);
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
  const rowsBase = snapshot === null ? [] : listMapRenderableRows(snapshot);
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

function occupiedKeysFromLiveSnapshot(): Set<string> {
  if (snapshot === null) {
    return new Set();
  }
  const keys = new Set<string>();
  for (const o of snapshot.worldMap.occupants) {
    keys.add(occupancyKeyForPosition(o.x, o.y));
  }
  return keys;
}

function structureAnchorsFromLiveSnapshot(): Array<{ x: number; y: number }> {
  if (snapshot === null) {
    return [];
  }
  return snapshot.worldMap.occupants
    .filter((o): o is SnapshotStructureOccupant => o.kind === "structure")
    .map((o) => ({ x: o.x, y: o.y }));
}

function paintStreetSigns(): void {
  if (snapshot === null) {
    for (const ch of [...streetSignsLayer.children]) {
      streetSignsLayer.removeChild(ch);
      ch.destroy({ children: true });
    }
    return;
  }
  const layout = resolveWorldLayout();
  const zones: StreetSignZone[] = layout.zones.map((z) => ({
    id: z.id,
    streetLabel: z.streetLabel,
    rect: { ...z.rect },
  }));
  mountStreetSignPosts({
    layer: streetSignsLayer,
    palette,
    worldToLocal: worldToWorldRootLocal,
    cellScale,
    zones,
  });
}

function paintGrid(): void {
  gridGraphics.clear();
  const settings = getPreviewViewSettings();
  if (!settings.debugOccupancyQuartiles && !settings.debugOccupancyFreeGrids) {
    return;
  }

  const strokeZoneRect = (bounds: WorldBounds, stroke: {
    width: number;
    color: number;
    alpha: number;
  }): void => {
    const minWx = bounds.minX;
    const maxWx = bounds.maxX + 1;
    const minWy = bounds.minY;
    const maxWy = bounds.maxY + 1;
    const tl = worldToWorldRootLocal(minWx, maxWy);
    const w = (maxWx - minWx) * cellScale;
    const h = (maxWy - minWy) * cellScale;
    gridGraphics.rect(tl.x, tl.y, w, h).stroke(stroke);
  };

  if (settings.debugOccupancyQuartiles) {
    const layout = resolveWorldLayout();
    for (const zone of layout.zones) {
      strokeZoneRect(zone.rect, zoneDebugStroke(zone.primaryGroup));
    }
  }

  if (settings.debugOccupancyFreeGrids) {
    const layout = resolveWorldLayout();
    const agentZone = pickZoneForGroup(layout, "agent");
    const spaceZone = pickZoneForGroup(layout, "space");
    const occupied = occupiedKeysFromLiveSnapshot();
    const existingOccupants = [...playerWorldPos.values()].map((pos) => ({
      x: pos.x,
      y: pos.y,
    }));
    const structureAnchors = structureAnchorsFromLiveSnapshot();
    const dotR = Math.max(2.5, cellScale * 0.065);
    for (const p of listOccupancyPointsForZone(agentZone)) {
      if (
        isAgentSpawnOccupancyPointAvailableInZone({
          zone: agentZone,
          point: p,
          occupiedKeys: occupied,
          existingOccupants,
        })
      ) {
        const loc = worldToWorldRootLocal(p.x, p.y);
        gridGraphics
          .circle(loc.x, loc.y, dotR)
          .fill({ color: 0x22c55e, alpha: 0.5 });
      }
    }
    for (const p of listOccupancyPointsForZone(spaceZone)) {
      if (
        isSpaceAnchorOccupancyPointAvailableInZone({
          zone: spaceZone,
          point: p,
          occupiedKeys: occupied,
          existingOccupants,
          structureAnchors,
          minDistance: DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
          structureMinDistance: SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE,
        })
      ) {
        const loc = worldToWorldRootLocal(p.x, p.y);
        gridGraphics
          .circle(loc.x, loc.y, dotR)
          .fill({ color: 0x38bdf8, alpha: 0.55 });
      }
    }
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
    primaryAmenity?: string;
    amenities?: readonly string[];
  }[];
  zones: readonly {
    id: string;
    streetId: string;
    streetLabel: string;
    primaryGroup: OccupantGroup;
    occupantCount: number;
  }[];
} {
  if (snapshot === null) {
    return { agents: [], structures: [], zones: [] };
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
    primaryAmenity: s.primaryAmenity,
    amenities: s.amenities,
  }));
  const layout = resolveWorldLayout();
  const allOccupantPositions: { x: number; y: number }[] = snapshot.worldMap.occupants.map((o) => ({
    x: o.x,
    y: o.y,
  }));
  if (humanPos !== undefined) {
    allOccupantPositions.push({ x: humanPos.x, y: humanPos.y });
  }
  const zones = layout.zones.map((z) => {
    let occupantCount = 0;
    for (const p of allOccupantPositions) {
      if (pointCellInZone(p.x, p.y, z)) {
        occupantCount += 1;
      }
    }
    return {
      id: z.id,
      streetId: z.streetId,
      streetLabel: z.streetLabel,
      primaryGroup: z.primaryGroup,
      occupantCount,
    };
  });
  return { agents, structures, zones };
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
    debugPanelSyncCompanionLayout?.();
  }
}

function applyJoystickVisibility(): void {
  const v = getPreviewViewSettings();
  const show = v.joystickEnabled;
  joystickHandle?.setVisible(show);
  if (!show) {
    setJoystickVectorZero();
    resetPlayPadKeyBuffer();
  }
}

function rebuildSceneForTheme(): void {
  if (appStage === null || pixiHandle === null) return;
  const theme = getActiveSceneTheme();
  deepLogText("rebuildSceneForTheme", {
    themeId: theme.id,
    grassBandTopRatio: theme.grassBandTopRatio,
  });
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
    appStage.addChildAt(crowdLayerContainer, 0);
  }
  rebuildParkWorldBackdrop();
  paintStreetSigns();
  skyDecor?.setBounds(VIEW_W, VIEW_H, theme.grassBandTopRatio);
}

function onTick(dt: number): void {
  const speed = 2.2;
  const joySpeed = 3.5;
  const arrowSpeed = 2.8;
  const wb = getWorldBoundsForClamp();
  const settings = getPreviewViewSettings();
  const primaryId = getHumanPlayerId();
  const overworldActive =
    stageController === null ||
    stageController.current()?.id === "overworld";
  const joystickActive =
    settings.joystickEnabled && primaryId !== null;
  const jv = joystickActive ? getJoystickVector() : { x: 0, y: 0 };
  const joyLen = Math.hypot(jv.x, jv.y);
  const anyArrow =
    arrowKeys.up || arrowKeys.down || arrowKeys.left || arrowKeys.right;

  if (
    overworldActive &&
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
    if (!overworldActive) {
      lastTickWorldPos.set(id, { ...pos });
      movingByPlayer.set(id, false);
      continue;
    }
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
    if (wb !== null) {
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
  maybePublishGeographyPresence(performance.now());
  skyDecor?.tick(dt);
  stageController?.update(dt * 1000);
  const currentStageId = stageController?.current()?.id;
  if (currentStageId === "spaceYard") {
    tickYardPlayer(dt);
  } else if (
    currentStageId === "amenityShop" ||
    currentStageId === "amenitySupermarket" ||
    currentStageId === "amenityCarWash"
  ) {
    tickAmenityPlayer(dt);
  }
  updateCameraAndWorldRoot();
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
  const stageId = stageController?.current()?.id ?? "overworld";
  if (agentChatOverlays !== null && agentChatOverlays.root !== undefined) {
    agentChatOverlays.root.style.display =
      stageId === "overworld" ? "" : "none";
  }
  if (stageId === "overworld") {
    agentChatOverlays?.syncAgentIds(aliveIds);
  }
  const box = Math.max(16, Math.min(40, cellScale * 0.85));
  for (const [id, wpos] of playerWorldPos) {
    const v = agentNodes.get(id);
    if (v === undefined) continue;
    const anchorLocal = getAgentHeroAnchorLocal(id, wpos, box);
    const { cx, cy } = getAgentHeroAnchorScreen(id, wpos, box);
    const scale = Math.max(0.35, Math.min(0.85, cellScale / 48));
    v.root.position.set(anchorLocal.x, anchorLocal.y);
    drawPlatformHero(v.hero, {
      scale,
      facing: facingByPlayer.get(id) ?? "right",
      walkPhase: walkPhaseByPlayer.get(id) ?? 0,
      isMoving: movingByPlayer.get(id) ?? false,
    });
    const displayName =
      snapshot === null
        ? id
        : listAgentRows(snapshot).find((pl) => pl.agentId === id)?.name ??
          listHumanRows(snapshot).find((h) => h.id === id)?.name ??
          id;
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
  const prevProximityPartnerId = lastProximityPartnerId;
  const primaryPid = getHumanPlayerId();
  const onOverworld =
    stageController === null || stageController.current()?.id === "overworld";
  if (
    onOverworld &&
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
  if (
    prevProximityPartnerId !== null &&
    prevProximityPartnerId !== lastProximityPartnerId
  ) {
    sessionInteractionPanel?.closeVoiceConnection();
  }
  const humanWorldPos =
    primaryPid !== null ? playerWorldPos.get(primaryPid) ?? null : null;
  if (
    onOverworld &&
    lastProximityPartnerId === null &&
    humanWorldPos !== null &&
    structs.length > 0
  ) {
    lastStructureProximityTarget = findNearestStructureProximityTarget({
      player: humanWorldPos,
      structures: structs,
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
  } else {
    lastStructureProximityTarget = null;
  }
  if (stageController?.current()?.id !== "spaceYard") {
    lastYardAmenityPadTarget = null;
  }
  if (proximityLegendEl !== null) {
    if (
      activeAmenityStage !== null &&
      activeAmenityStage.nearestBuyable !== null
    ) {
      const buyable = activeAmenityStage.nearestBuyable;
      const sold = buyable.tooltipModel.sale.status === "sold";
      proximityLegendEl.textContent = sold
        ? `Near ${buyable.tooltipModel.name} (SOLD). P: view`
        : `Near ${buyable.tooltipModel.name}. P: buy ($${buyable.tooltipModel.priceUsd.toFixed(2)})`;
    } else if (lastYardAmenityPadTarget !== null) {
      const amenityName =
        AMENITY_DISPLAY_LABEL[lastYardAmenityPadTarget.kind as AmenityKind];
      proximityLegendEl.textContent = `Near ${amenityName}. P: enter ${amenityName.toLowerCase()}`;
    } else if (lastProximityPartnerId !== null) {
      proximityLegendEl.textContent = `Near ${playerDisplayName(lastProximityPartnerId)}. A: for assist · C: for chat · P: push to talk · Z: for zone · Y: for yield`;
    } else if (lastStructureProximityTarget !== null) {
      const spaceName =
        lastStructureProximityTarget.label ??
        lastStructureProximityTarget.spaceId;
      proximityLegendEl.textContent = `Near ${spaceName}. A: enter space`;
    } else {
      proximityLegendEl.textContent =
        "Near another player: A: for assist · C: for chat · P: push to talk · Z: for zone · Y: for yield";
    }
  }
  if (proximityPromptEl !== null) {
    if (lastProximityPartnerId !== null) {
      const pos = playerWorldPos.get(lastProximityPartnerId);
      if (pos !== undefined) {
        const { cx, cy } = getAgentHeroAnchorScreen(lastProximityPartnerId, pos, box);
        proximityPromptEl.textContent =
          "A: for assist\nC: for chat\nP: push to talk";
        proximityPromptEl.style.display = "block";
        proximityPromptEl.style.left = `${cx}px`;
        proximityPromptEl.style.top = `${cy - box * 1.35}px`;
      } else {
        proximityPromptEl.style.display = "none";
      }
    } else if (lastStructureProximityTarget !== null) {
      const centroidLocal = worldToWorldRootLocal(
        lastStructureProximityTarget.centroid.x,
        lastStructureProximityTarget.centroid.y
      );
      const centroidScreen = worldRootLocalToCanvas(
        centroidLocal.x,
        centroidLocal.y
      );
      const spaceName =
        lastStructureProximityTarget.label ??
        lastStructureProximityTarget.spaceId;
      proximityPromptEl.textContent = `A: enter ${spaceName}`;
      proximityPromptEl.style.display = "block";
      proximityPromptEl.style.left = `${centroidScreen.x}px`;
      proximityPromptEl.style.top = `${centroidScreen.y - box * 1.6}px`;
    } else {
      proximityPromptEl.style.display = "none";
    }
  }
  agentChatOverlays?.setProximityFocus(lastProximityPartnerId);
  proximityTouchPadHandle?.refresh();
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
    deepLogText("bootstrap:start", {
      sid,
      apiBase: API_BASE,
      host:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
      settings: getPreviewViewSettings(),
    });
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
      occupancyDebug: {
        getSettings: () => ({
          debugOccupancyQuartiles:
            getPreviewViewSettings().debugOccupancyQuartiles,
          debugOccupancyFreeGrids:
            getPreviewViewSettings().debugOccupancyFreeGrids,
        }),
        setSettings: (partial) => {
          setPreviewViewSettings(partial);
        },
      },
      geographyDebug: {
        getSettings: () => ({
          worldGeographyEnabled:
            getPreviewViewSettings().worldGeographyEnabled,
        }),
        setSettings: (partial) => {
          const prev = getPreviewViewSettings().worldGeographyEnabled;
          setPreviewViewSettings(partial);
          if (
            partial.worldGeographyEnabled !== undefined &&
            partial.worldGeographyEnabled !== prev
          ) {
            void syncWorldGeographyEnabled(partial.worldGeographyEnabled);
          }
        },
      },
    });
    debugPanelUpdate = debug.update;
    debugPanelSyncCompanionLayout = debug.syncCompanionLayout;
    debugMount.appendChild(debug.element);
    globalChatRoom = createPreviewGlobalChatRoom({
      apiBase: API_BASE,
      getSid,
      getMainNodeId: getMainNodeIdForIntercom,
      resolveSenderName: globalSenderName,
      getP2aEnabled: () => getPreviewViewSettings().p2aEnabled,
      setP2aEnabled: (enabled) => {
        const previous = getPreviewViewSettings().p2aEnabled;
        setPreviewViewSettings({ p2aEnabled: enabled });
        reportP2aToggleIfChanged(previous, enabled);
        if (enabled) {
          if (!isValidIntercomAddress(activeIntercomAddress)) {
            activeIntercomAddress = resolvePersonalIntercomAddress();
          }
          globalChatRoom?.refreshP2a();
        }
      },
      getIntercomAddress: () => activeIntercomAddress,
      ensureIntercomAddress: () => {
        if (!isValidIntercomAddress(activeIntercomAddress)) {
          activeIntercomAddress = resolvePersonalIntercomAddress();
        }
        globalChatRoom?.refreshP2a();
        return activeIntercomAddress;
      },
    });
    spacesCtaPanel = createPreviewSpacesCtaPanel();

    const centerCol = document.createElement("div");
    centerCol.className = "preview-game-col preview-game-col--center";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "preview-canvas-wrap";

    const canvasHost = document.createElement("div");
    canvasHost.className = "preview-canvas-host";
    canvasHost.style.cssText = `display:block;position:absolute;width:${VIEW_W}px;height:${VIEW_H}px;overflow:hidden;`;
    canvasHostRef = canvasHost;

    const joystickWrap = document.createElement("div");
    joystickWrap.className = "preview-joystick-wrap";

    canvasWrap.appendChild(canvasHost);

    const mobileBackdrop = document.createElement("button");
    mobileBackdrop.type = "button";
    mobileBackdrop.className = "preview-mobile-side-backdrop";
    mobileBackdrop.setAttribute("aria-label", "Close side panel");

    const toggleLeft = document.createElement("button");
    toggleLeft.type = "button";
    toggleLeft.className =
      "preview-mobile-side-toggle preview-mobile-side-toggle--left";
    toggleLeft.textContent = "Messages";
    toggleLeft.setAttribute("aria-controls", "preview-side-left");
    const toggleRight = document.createElement("button");
    toggleRight.type = "button";
    toggleRight.className =
      "preview-mobile-side-toggle preview-mobile-side-toggle--right";
    toggleRight.textContent = "Session";
    toggleRight.setAttribute("aria-controls", "preview-side-right");

    centerCol.append(canvasWrap, joystickWrap, mobileBackdrop);

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
      "Near another player: A: for assist · C: for chat · P: push to talk · Z: for zone · Y: for yield";
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
      getWalletHud: () => walletHud,
      onServerWalletAppliedToHud: () => {
        if (walletInventoryPanel !== null && walletInventoryPanel.isOpen()) {
          void refreshWalletInventoryPanel();
        }
      },
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
      onClosePanel: () => {
        mobileSidePanelControls?.closePanels();
      },
    });

    controlStack.append(proximityLegend, sessionInteractionPanel.element);
    const wideOnBoot = window.matchMedia(
      PREVIEW_WIDE_SIDEBAR_MEDIA_QUERY
    ).matches;
    const stationaryOnBoot =
      getPreviewViewSettings().stationaryPanels && wideOnBoot;
    if (stationaryOnBoot) {
      leftCol.append(globalChatRoom.element, spacesCtaPanel.element);
      rightCol.append(controlStack, debugMount);
    } else {
      leftCol.append(
        globalChatRoom.element,
        spacesCtaPanel.element,
        debugMount
      );
      rightCol.append(controlStack);
    }

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

    worldRoot.addChild(parkBackdropLayer);
    worldRoot.addChild(streetSignsLayer);
    worldRoot.addChild(gridGraphics);
    worldRoot.addChild(structureLayer);
    worldRoot.addChild(agentsLayer);
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
    deepLogTree("pixiStage", handle.app.stage as unknown);
    applyBounds(MINIMUM_PLAY_WORLD_BOUNDS);
    updateCameraAndWorldRoot();
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
    stageController = createStageController({ parent: handle.app.stage });
    await stageController.enter(
      createOverworldStage({ root: worldRoot })
    );
    skyDecor = createSkyDecorLayer({
      width: VIEW_W,
      height: VIEW_H,
      grassBandTopRatio: theme.grassBandTopRatio,
    });
    handle.app.stage.addChild(skyDecor.container);
    const syncWorldScale = (): void => {
      syncPreviewCanvasHostScale({
        stage: canvasWrap,
        host: canvasHost,
        viewWidth: VIEW_W,
        viewHeight: VIEW_H,
      });
    };
    syncWorldScale();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            syncWorldScale();
          });
    resizeObserver?.observe(canvasWrap);
    window.addEventListener("resize", syncWorldScale);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSkyMotion = (): void => {
      skyDecor?.setReducedMotion(motionQuery.matches);
    };
    syncSkyMotion();
    motionQuery.addEventListener("change", syncSkyMotion);

    canvasHost.appendChild(agentChatOverlays.root);
    // Wallet HUD, inventory panel, and the amenity item tooltip use
    // `position: fixed` to escape the `centerCol` stacking context (and
    // the `transform` on `canvasHost` which would otherwise constrain
    // fixed-position children). Mounting them on `document.body` keeps
    // their containing block as the viewport, which is what they want.
    walletHud = createWalletHud({
      parent: document.body,
      onClick: () => openWalletInventoryPanel(),
    });
    walletInventoryPanel = createWalletInventoryPanel({
      parent: document.body,
      onRefresh: () => {
        void refreshWalletInventoryPanel();
      },
      onRedeemBundle: async (bundleId) => {
        const sid = getSid();
        const playerId = getViewerWalletPlayerId();
        if (sid === null || playerId === null) {
          throw new Error("Sign in to redeem bundles.");
        }
        await redeemWalletBundle({ sid, playerId, bundleId });
        await refreshWalletInventoryPanel();
      },
    });
    void refreshWalletHud();
    proximityPromptEl = document.createElement("div");
    proximityPromptEl.className = "preview-proximity-prompt";
    proximityPromptEl.textContent = "A: for assist\nC: for chat\nP: push to talk";
    canvasHost.appendChild(proximityPromptEl);
    amenityItemTooltip = createItemTooltip({ parent: document.body });

    proximityTouchPadHandle = createPreviewProximityTouchControls({
      parent: canvasWrap,
      getBoundsElement: () => canvasHost,
      getCanAct: () => {
        const partner = registeredAgentPartnerForProximityOrNull(
          lastProximityPartnerId
        );
        return partner !== null && partner !== HUMAN_VIEWER_PLAYER_ID;
      },
      getStructureProximityLabel: () => {
        if (lastProximityPartnerId !== null) return null;
        const target = lastStructureProximityTarget;
        if (target === null) return null;
        return target.label ?? target.spaceId;
      },
      getAmenityProximityLabel: () => {
        const target = lastYardAmenityPadTarget;
        if (target === null) return null;
        return AMENITY_DISPLAY_LABEL[target.kind as AmenityKind];
      },
      getAmenityItemActionLabel: () => {
        const stage = activeAmenityStage;
        if (stage === null) return null;
        const buyable = stage.nearestBuyable;
        if (buyable === null) return null;
        return buyable.tooltipModel.sale.status === "sold" ? "View" : "Buy";
      },
      onAssist: () => {
        if (
          lastProximityPartnerId === null &&
          lastStructureProximityTarget !== null
        ) {
          void enterStructureSpaceFromProximity(lastStructureProximityTarget);
          return;
        }
        triggerProximityAssistOrChat("assist");
      },
      onChat: () => {
        triggerProximityAssistOrChat("chat");
      },
      onPushToTalk: () => {
        if (activeAmenityStage !== null) {
          const stage = activeAmenityStage;
          const buyable = stage.nearestBuyable;
          if (buyable !== null) {
            cycleAmenityItemAction(stage, buyable);
            return;
          }
        }
        if (lastYardAmenityPadTarget !== null) {
          void enterAmenityFromYardPad(lastYardAmenityPadTarget);
          return;
        }
        void triggerProximityPushToTalk();
      },
      onWallet: () => {
        openWalletInventoryPanel();
      },
    });

    joystickHandle = createPreviewDebugJoystick({ parent: joystickWrap });
    const wideSidebarMq = window.matchMedia(PREVIEW_WIDE_SIDEBAR_MEDIA_QUERY);
    const previewDockStationaryActive = (): boolean =>
      getPreviewViewSettings().stationaryPanels && wideSidebarMq.matches;

    const previewMessagesFloatingPlacement = (): {
      leftPx: number;
      topPx: number;
    } => ({ leftPx: 16, topPx: 16 });

    const previewSessionFloatingPlacement = (): {
      leftPx: number;
      topPx: number;
    } => ({
      leftPx: Math.max(16, window.innerWidth - 376),
      topPx: 16,
    });

    const previewDebugFloatingPlacement = (): {
      leftPx: number;
      topPx: number;
    } => ({ leftPx: 16, topPx: 380 });

    const previewMessagesStationaryPlacement = (): {
      leftPx: number;
      topPx: number;
    } => ({ leftPx: 16, topPx: 16 });

    const previewSessionStationaryPlacement = (): {
      leftPx: number;
      topPx: number;
    } => {
      const w = rightCol.clientWidth;
      const panelW = Math.min(380, Math.max(200, w - 24));
      return {
        leftPx: Math.max(16, w - panelW - 16),
        topPx: 16,
      };
    };

    const previewDebugStationaryPlacement = (): {
      leftPx: number;
      topPx: number;
    } => {
      const w = rightCol.clientWidth;
      const panelW = Math.min(360, Math.max(200, w - 24));
      const leftPx = Math.max(16, w - panelW - 16);
      const gap = 12;
      const topPx = controlStack.offsetTop + controlStack.offsetHeight + gap;
      return { leftPx, topPx };
    };

    const floatingPanelHandles = {
      messages: attachPreviewFloatingPanelDrag({
        element: globalChatRoom.element,
        getBoundsElement: () =>
          previewDockStationaryActive() ? leftCol : canvasStage,
        label: "World messages",
        initialPlacement: { leftPx: 16, topPx: 16 },
        className: "preview-floating-panel--messages",
        layoutMode: stationaryOnBoot ? "stationary" : "floating",
        resolvePlacement: (mode) =>
          mode === "stationary"
            ? previewMessagesStationaryPlacement()
            : previewMessagesFloatingPlacement(),
      }),
      session: attachPreviewFloatingPanelDrag({
        element: controlStack,
        getBoundsElement: () =>
          previewDockStationaryActive() ? rightCol : canvasStage,
        label: "Human agent interaction",
        initialPlacement: {
          leftPx: Math.max(16, window.innerWidth - 376),
          topPx: 16,
        },
        className: "preview-floating-panel--session",
        layoutMode: stationaryOnBoot ? "stationary" : "floating",
        resolvePlacement: (mode) =>
          mode === "stationary"
            ? previewSessionStationaryPlacement()
            : previewSessionFloatingPlacement(),
      }),
      debug: attachPreviewFloatingPanelDrag({
        element: debugMount,
        getBoundsElement: () =>
          previewDockStationaryActive() ? rightCol : canvasStage,
        label: "Debug",
        initialPlacement: { leftPx: 16, topPx: 380 },
        className: "preview-floating-panel--debug",
        layoutMode: stationaryOnBoot ? "stationary" : "floating",
        resolvePlacement: (mode) =>
          mode === "stationary"
            ? previewDebugStationaryPlacement()
            : previewDebugFloatingPlacement(),
      }),
    };
    const floatingPanels = [
      floatingPanelHandles.messages,
      floatingPanelHandles.session,
      floatingPanelHandles.debug,
    ];
    const applyPreviewPanelLayout = (): void => {
      const room = globalChatRoom;
      if (room === null) return;
      const wantStationary =
        getPreviewViewSettings().stationaryPanels && wideSidebarMq.matches;
      canvasStage.classList.toggle(
        "preview-canvas-stage--stationary-panels",
        wantStationary
      );
      shell.classList.toggle(
        "preview-shell--stationary-panels",
        wantStationary
      );
      if (wantStationary) {
        leftCol.append(room.element);
        rightCol.append(controlStack, debugMount);
      } else {
        leftCol.append(room.element, debugMount);
        rightCol.append(controlStack);
      }
      const mode = wantStationary ? "stationary" : "floating";
      floatingPanelHandles.messages.setLayoutMode(mode);
      floatingPanelHandles.session.setLayoutMode(mode);
      floatingPanelHandles.messages.refreshBounds();
      floatingPanelHandles.session.refreshBounds();
      requestAnimationFrame(() => {
        floatingPanelHandles.debug.setLayoutMode(mode);
        floatingPanelHandles.debug.refreshBounds();
        floatingPanels.forEach((panel) => panel.refreshBounds());
        debugPanelSyncCompanionLayout?.();
        refreshSpacesCtaPlacement();
      });
    };

    const refreshSpacesCtaPlacement = (): void => {
      const room = globalChatRoom;
      const cta = spacesCtaPanel;
      if (room === null || cta === null || cta.isDismissed()) return;
      const boundsHost = previewDockStationaryActive() ? leftCol : canvasStage;
      const boundsRect = boundsHost.getBoundingClientRect();
      const anchorRect = room.element.getBoundingClientRect();
      cta.refresh({
        anchorRect: {
          left: anchorRect.left,
          top: anchorRect.top,
          width: anchorRect.width,
          height: anchorRect.height,
        },
        boundsRect: {
          left: boundsRect.left,
          top: boundsRect.top,
          width: boundsRect.width,
          height: boundsRect.height,
        },
      });
    };
    const scheduleSpacesCtaRefresh = (): void => {
      requestAnimationFrame(refreshSpacesCtaPlacement);
    };

    applyPreviewPanelLayout();
    wideSidebarMq.addEventListener("change", applyPreviewPanelLayout);
    window.addEventListener("resize", () => {
      floatingPanels.forEach((panel) => panel.refreshBounds());
      scheduleSpacesCtaRefresh();
    });

    if (globalChatRoom !== null && spacesCtaPanel !== null) {
      const messagesElement = globalChatRoom.element;
      if (typeof ResizeObserver !== "undefined") {
        const resizeObs = new ResizeObserver(() => {
          scheduleSpacesCtaRefresh();
        });
        resizeObs.observe(messagesElement);
      }
      const mutationObs = new MutationObserver(() => {
        scheduleSpacesCtaRefresh();
      });
      mutationObs.observe(messagesElement, {
        attributes: true,
        attributeFilter: ["style", "class", "hidden"],
      });
      scheduleSpacesCtaRefresh();
    }

    let messagesPanelVisible = true;
    const applyMessagesPanelVisibility = (): void => {
      leftCol.style.display = "";
      leftCol.classList.toggle(
        "preview-game-col--messages-hidden",
        !messagesPanelVisible
      );
      if (globalChatRoom !== null) {
        globalChatRoom.element.hidden = !messagesPanelVisible;
      }
      if (spacesCtaPanel !== null && !spacesCtaPanel.isDismissed()) {
        spacesCtaPanel.element.hidden = !messagesPanelVisible;
      }
      debugMount.classList.toggle(
        "preview-debug-mount--messages-hidden",
        !messagesPanelVisible
      );
      if (messagesPanelVisible) {
        debug.element.classList.remove("preview-debug-panel--expanded");
      }
      debug.syncCompanionLayout();
      if (messagesPanelVisible && mobileSidePanelControls?.isMobileViewport() === true) {
        mobileSidePanelControls.openLeftPanel();
      }
      if (!messagesPanelVisible) {
        mobileSidePanelControls?.closePanels();
      }
      messagesButton.setAttribute("aria-pressed", messagesPanelVisible ? "true" : "false");
    };

    const bottomBar = createPreviewBottomBar({
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
        applyPreviewPanelLayout();
      },
      includeThemePanel: false,
    });
    const menuBar = bottomBar.querySelector(".preview-menu-bar");
    const messagesButton = document.createElement("button");
    messagesButton.type = "button";
    messagesButton.className = "preview-chat-settings-toggle";
    messagesButton.textContent = "Messages";
    messagesButton.setAttribute("aria-controls", "preview-side-left");
    messagesButton.addEventListener("click", () => {
      messagesPanelVisible = !messagesPanelVisible;
      applyMessagesPanelVisibility();
    });
    menuBar?.prepend(messagesButton);
    shell.appendChild(bottomBar);

    applyChatVisibility();
    applyDebugVisibility();
    applyJoystickVisibility();
    applyMessagesPanelVisibility();
    exposeWorldConsoleApi();

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
