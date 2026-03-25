import { Container, Graphics, Text } from "pixi.js";
import { nextAvatarMotion } from "./avatar-anim.js";
import { buildCrowdLayer } from "./crowd-draw.js";
import { layoutCrowdClusters } from "./crowd-layout.js";
import { drawPlatformHero } from "./hero-puppet.js";
import {
  cssColorToPixi,
  mergeMultiversePalette,
  structureFill,
  type MultiversePalette,
} from "./multiverse-engine.js";
import {
  appendChatLogLine,
  resetChatLogFromSnapshot,
} from "./preview-chat-log.js";
import {
  createPreviewChatPanel,
  ensurePreviewChatStyles,
} from "./preview-chat-panel.js";
import { createPixiPreview } from "./pixi-multiverse.js";
import { ENABLE_CROWD_LAYER, getActiveSceneTheme } from "./scene-theme.js";
import { drawHomeStructure, drawToolPad } from "./structure-art.js";
import type { AvatarFacing } from "./avatar-anim.js";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || "";
const VIEW_W = 720;
const VIEW_H = 520;
const CELL = 48;
const ORIGIN_X = 24;
const WORLD_BOTTOM_MARGIN = 14;
const WORLD_INTERACTION_SSE = "world:interaction";
const HOME_STAND_EPS = 0.26;
const HOME_FRONT_OFFSET_WX = 0.16;
const HOME_FRONT_OFFSET_WY = 0.22;

type Structure = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label?: string;
  toolName?: string;
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
  playerId: string;
  path: PathStep[];
  structures: Structure[];
};

type SnapshotInteraction = {
  role: string;
  text: string;
  at?: string;
  seq?: number;
};

type PlayerRow = {
  playerId: string;
  name: string;
  structures: Structure[];
  lastUpdate?: JourneyUpdate;
  recentInteractions?: SnapshotInteraction[];
};

type WorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  structures: (Structure & { playerId?: string })[];
};

type Snapshot = {
  sid: string;
  players: PlayerRow[];
  worldMap?: WorldMapJson;
};

type AgentVisual = {
  root: Container;
  hero: Graphics;
  nameTag: Text;
};

type StructureVisual = {
  box: Graphics;
  caption: Text;
};

function getSid(): string | null {
  return new URLSearchParams(location.search).get("sid");
}

let mapMinX = 0;
let mapMinY = 0;
let mapMaxX = 0;
let mapMaxY = 0;
let cellScale = CELL;
let worldOriginScreenY = VIEW_H - WORLD_BOTTOM_MARGIN - 8 * CELL;
let gridBounds: WorldMapJson["bounds"] | null = null;

let palette: MultiversePalette = mergeMultiversePalette({});

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

function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (wx - mapMinX) * cellScale,
    y: worldOriginScreenY + (mapMaxY - wy) * cellScale,
  };
}

const playerWorldPos = new Map<string, { x: number; y: number }>();
const waypointQueues = new Map<string, Array<{ x: number; y: number }>>();
const lastTickWorldPos = new Map<string, { x: number; y: number }>();
const walkPhaseByPlayer = new Map<string, number>();
const facingByPlayer = new Map<string, AvatarFacing>();
const movingByPlayer = new Map<string, boolean>();

let snapshot: Snapshot | null = null;

let appStage: Container | null = null;
const structureLayer = new Container();
const gridGraphics = new Graphics();
const agentsLayer = new Container();
const worldLayer = new Container();

const structureNodes = new Map<string, StructureVisual>();
const agentNodes = new Map<string, AgentVisual>();

let refreshPreviewChat: () => void = () => {};

function playerDisplayName(playerId: string): string {
  return (
    snapshot?.players.find((p) => p.playerId === playerId)?.name ?? playerId
  );
}

function pushInteractionToChat(
  playerId: string,
  role: string,
  text: string,
  seq?: number
): void {
  appendChatLogLine({
    playerId,
    playerName: playerDisplayName(playerId),
    role,
    text,
    seq,
  });
  refreshPreviewChat();
}

function hydrateChatFromSnapshot(s: Snapshot): void {
  resetChatLogFromSnapshot(s);
  refreshPreviewChat();
}

function collectStructuresForRender(s: Snapshot): Structure[] {
  const byId = new Map<string, Structure>();
  for (const pl of s.players) {
    for (const st of pl.structures) {
      byId.set(st.id, { ...st, playerId: pl.playerId });
    }
  }
  for (const st of s.worldMap?.structures ?? []) {
    const prev = byId.get(st.id);
    if (prev !== undefined) {
      byId.set(st.id, {
        ...prev,
        ...st,
        playerId: st.playerId ?? prev.playerId,
      });
    } else {
      byId.set(st.id, { ...st });
    }
  }
  const list = [...byId.values()];
  list.sort((a, b) => {
    const rank = (k: string): number => (k === "home" ? 0 : 1);
    const ar = rank(a.kind);
    const br = rank(b.kind);
    if (ar !== br) return ar - br;
    return a.id.localeCompare(b.id);
  });
  return list;
}

function getPlayerHomeCell(
  playerId: string,
  s: Snapshot | null
): { x: number; y: number } | null {
  if (s === null) return null;
  for (const st of collectStructuresForRender(s)) {
    if (st.kind === "home" && st.playerId === playerId) {
      return { x: st.x, y: st.y };
    }
  }
  return null;
}

function setWaypoints(playerId: string, path: PathStep[]): void {
  const pts: Array<{ x: number; y: number }> = [];
  for (const step of path) {
    if (typeof step.x === "number" && typeof step.y === "number") {
      pts.push({ x: step.x, y: step.y });
    }
  }
  if (pts.length > 0) waypointQueues.set(playerId, pts);
}

function applyJourneyUpdate(u: JourneyUpdate): void {
  setWaypoints(u.playerId, u.path);
}

async function loadSnapshot(sid: string): Promise<void> {
  const res = await fetch(`${BASE}/snapshot.json?sid=${encodeURIComponent(sid)}`);
  if (!res.ok) return;
  snapshot = (await res.json()) as Snapshot;
  const b = snapshot.worldMap?.bounds;
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
  for (const p of snapshot.players) {
    if (!playerWorldPos.has(p.playerId)) {
      playerWorldPos.set(p.playerId, { x: 0, y: 0 });
    }
    if (p.lastUpdate) applyJourneyUpdate(p.lastUpdate);
  }
  hydrateChatFromSnapshot(snapshot);
}

function connectSse(sid: string): void {
  const es = new EventSource(
    `${BASE}/events?sid=${encodeURIComponent(sid)}`
  );
  es.addEventListener("world:journey", (ev) => {
    const data = JSON.parse((ev as MessageEvent).data) as JourneyUpdate;
    applyJourneyUpdate(data);
  });
  es.addEventListener("world:player_added", () => {
    void loadSnapshot(sid);
  });
  es.addEventListener("world:structures", () => {
    void loadSnapshot(sid);
  });
  es.addEventListener(WORLD_INTERACTION_SSE, (ev) => {
    const data = JSON.parse((ev as MessageEvent).data) as {
      playerId: string;
      role: string;
      text: string;
      seq?: number;
    };
    pushInteractionToChat(data.playerId, data.role, data.text, data.seq);
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
    if (st.kind === "home") {
      drawHomeStructure(n.box, box, theme.house);
      n.box.position.set(sx, sy);
      n.caption.text = (st.label ?? "Home").slice(0, 24);
      n.caption.position.set(sx - n.caption.width / 2, sy - box * 1.15);
    } else {
      const fillCol = cssColorToPixi(structureFill(st.kind, palette));
      drawToolPad(n.box, box, fillCol, strokeCol);
      const bx = sx - box * 0.2;
      const by = sy - box * 0.2;
      n.box.position.set(bx, by);
      const capText =
        st.toolName !== undefined && st.toolName.length > 0
          ? st.toolName
          : (st.label ?? st.id).slice(0, 28);
      n.caption.text = capText.slice(0, 28);
      n.caption.position.set(sx - 4, sy - 20);
    }
  }
}

function syncAgentNodes(): void {
  const rows = snapshot?.players ?? [];
  const alive = new Set(rows.map((r) => r.playerId));
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
    if (!agentNodes.has(p.playerId)) {
      const v = makeAgentVisual();
      agentNodes.set(p.playerId, v);
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

function onTick(dt: number): void {
  const speed = 2.2;
  for (const [id, pos] of playerWorldPos) {
    const prev = { ...pos };
    let next = { ...pos };
    const queue = waypointQueues.get(id);
    if (queue && queue.length > 0) {
      const target = queue[0];
      if (target) {
        next = moveToward(pos, target, speed, dt);
        playerWorldPos.set(id, next);
        if (Math.hypot(target.x - next.x, target.y - next.y) < 0.08) {
          queue.shift();
        }
      }
    }
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
  const box = Math.max(16, Math.min(40, cellScale * 0.85));
  for (const [id, wpos] of playerWorldPos) {
    const v = agentNodes.get(id);
    if (v === undefined) continue;
    const home = getPlayerHomeCell(id, snapshot);
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
    const scale = Math.max(0.35, Math.min(0.85, cellScale / 48));
    const cx = sx + box * 0.3;
    const cy = sy + box * 0.55;
    v.root.position.set(cx, cy);
    drawPlatformHero(v.hero, {
      scale,
      facing: facingByPlayer.get(id) ?? "right",
      walkPhase: walkPhaseByPlayer.get(id) ?? 0,
      isMoving: movingByPlayer.get(id) ?? false,
    });
    const displayName =
      snapshot?.players.find((pl) => pl.playerId === id)?.name ?? id;
    v.nameTag.text = displayName.slice(0, 14);
    v.nameTag.position.set(-v.nameTag.width / 2, box * 0.45);
  }
}

function bootstrap(): void {
  const sid = getSid();
  if (!sid) return;
  const theme = getActiveSceneTheme();
  palette = mergeMultiversePalette(theme.palettePartial);
  void (async () => {
    ensurePreviewChatStyles();
    const shell = document.createElement("div");
    shell.style.cssText =
      "display:flex;flex-direction:column;align-items:center;min-height:100vh;";
    document.body.appendChild(shell);
    const chatPanel = createPreviewChatPanel({ widthPx: VIEW_W });
    refreshPreviewChat = chatPanel.refresh;

    const sceneRoot = theme.buildScene(VIEW_W, VIEW_H, 0x5cafe);
    worldLayer.addChild(gridGraphics);
    worldLayer.addChild(structureLayer);
    const handle = await createPixiPreview({
      width: VIEW_W,
      height: VIEW_H,
      parent: shell,
      backgroundColor: theme.appBackgroundColor,
      onTick,
      onFrame,
    });
    appStage = handle.app.stage;
    shell.appendChild(chatPanel.element);
    handle.app.stage.addChild(sceneRoot);
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
      handle.app.stage.addChild(buildCrowdLayer(crowdClusters));
    }
    handle.app.stage.addChild(worldLayer);
    handle.app.stage.addChild(agentsLayer);
    void loadSnapshot(sid).then(() => connectSse(sid));
  })();
}

bootstrap();
