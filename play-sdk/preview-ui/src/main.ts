import {
  startMultiverse,
  structureFill,
  type MultiversePalette,
} from "./multiverse-engine.js";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || "";
const VIEW_W = 720;
const VIEW_H = 520;
const CELL = 48;
const ORIGIN_X = 24;
const ORIGIN_Y = 24;
const WORLD_INTERACTION_SSE = "world:interaction";
const CALLOUT_MAX_LINES = 5;
const CALLOUT_CHARS_PER_LINE = 40;
const CALLOUT_LINE_SKIP = 12;

type Structure = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label?: string;
  toolName?: string;
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

type CalloutRow = { role: string; text: string };

function getSid(): string | null {
  return new URLSearchParams(location.search).get("sid");
}

let mapMinX = 0;
let mapMinY = 0;
let cellScale = CELL;
let gridBounds: WorldMapJson["bounds"] | null = null;

function applyBounds(bounds: WorldMapJson["bounds"]): void {
  gridBounds = bounds;
  const pad = 1;
  const w = Math.max(1, bounds.maxX - bounds.minX + 2 * pad);
  const h = Math.max(1, bounds.maxY - bounds.minY + 2 * pad);
  const maxW = VIEW_W - ORIGIN_X * 2;
  const maxH = VIEW_H - ORIGIN_Y * 2;
  cellScale = Math.min(maxW / w, maxH / h, 64);
  mapMinX = bounds.minX - pad;
  mapMinY = bounds.minY - pad;
}

function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (wx - mapMinX) * cellScale,
    y: ORIGIN_Y + (wy - mapMinY) * cellScale,
  };
}

const playerWorldPos = new Map<string, { x: number; y: number }>();
const waypointQueues = new Map<string, Array<{ x: number; y: number }>>();
const calloutLinesByPlayer = new Map<string, CalloutRow[]>();
let snapshot: Snapshot | null = null;

function pushCalloutLine(playerId: string, role: string, text: string): void {
  const excerpt = text.trim().slice(0, 200);
  if (excerpt.length === 0) return;
  const rows = calloutLinesByPlayer.get(playerId) ?? [];
  const next = [...rows, { role, text: excerpt }];
  while (next.length > CALLOUT_MAX_LINES) next.shift();
  calloutLinesByPlayer.set(playerId, next);
}

function collectStructuresForRender(s: Snapshot): Structure[] {
  const byId = new Map<string, Structure>();
  for (const pl of s.players) {
    for (const st of pl.structures) {
      byId.set(st.id, st);
    }
  }
  for (const st of s.worldMap?.structures ?? []) {
    byId.set(st.id, st);
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

function seedCalloutsFromSnapshot(players: PlayerRow[]): void {
  for (const p of players) {
    const ri = p.recentInteractions;
    if (ri === undefined || ri.length === 0) continue;
    const tail = ri.slice(-CALLOUT_MAX_LINES);
    calloutLinesByPlayer.set(
      p.playerId,
      tail.map((e) => ({
        role: e.role,
        text: e.text.slice(0, 200),
      }))
    );
  }
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
    cellScale = CELL;
    gridBounds = null;
  }
  for (const p of snapshot.players) {
    playerWorldPos.set(p.playerId, { x: 0, y: 0 });
    if (p.lastUpdate) applyJourneyUpdate(p.lastUpdate);
  }
  seedCalloutsFromSnapshot(snapshot.players);
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
    };
    pushCalloutLine(data.playerId, data.role, data.text);
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

function drawLabel(
  ctx: CanvasRenderingContext2D,
  palette: MultiversePalette,
  x: number,
  y: number,
  label: string,
  muted: boolean
): void {
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.fillStyle = muted ? palette.textMuted : palette.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, x, y);
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

startMultiverse({
  width: VIEW_W,
  height: VIEW_H,
  loop: {
    init: function init() {
      const sid = getSid();
      if (!sid) return;
      void loadSnapshot(sid).then(() => connectSse(sid));
    },
    update: function update(dt: number) {
      const speed = 2.2;
      for (const [id, pos] of playerWorldPos) {
        const queue = waypointQueues.get(id);
        if (!queue || queue.length === 0) continue;
        const target = queue[0];
        if (!target) continue;
        const next = moveToward(pos, target, speed, dt);
        playerWorldPos.set(id, next);
        if (Math.hypot(target.x - next.x, target.y - next.y) < 0.08) {
          queue.shift();
        }
      }
    },
    render: function render(ctx, board) {
      const p = board.palette;
      if (gridBounds !== null) {
        const pad = 1;
        const cols = Math.max(
          1,
          Math.ceil(gridBounds.maxX - gridBounds.minX + 2 * pad)
        );
        const rows = Math.max(
          1,
          Math.ceil(gridBounds.maxY - gridBounds.minY + 2 * pad)
        );
        ctx.strokeStyle = p.grid;
        ctx.lineWidth = 1;
        for (let c = 0; c <= cols; c += 1) {
          const gx = ORIGIN_X + c * cellScale;
          ctx.beginPath();
          ctx.moveTo(gx, ORIGIN_Y);
          ctx.lineTo(gx, ORIGIN_Y + rows * cellScale);
          ctx.stroke();
        }
        for (let r = 0; r <= rows; r += 1) {
          const gy = ORIGIN_Y + r * cellScale;
          ctx.beginPath();
          ctx.moveTo(ORIGIN_X, gy);
          ctx.lineTo(ORIGIN_X + cols * cellScale, gy);
          ctx.stroke();
        }
      }

      const structs = snapshot !== null ? collectStructuresForRender(snapshot) : [];
      const box = Math.max(16, Math.min(40, cellScale * 0.85));
      for (const st of structs) {
        const { x: sx, y: sy } = worldToScreen(st.x, st.y);
        const fill = structureFill(st.kind, p);
        const bx = sx - box * 0.2;
        const by = sy - box * 0.2;
        ctx.fillStyle = fill;
        ctx.fillRect(bx, by, box, box);
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, box, box);
        const cap = 28;
        const text =
          st.toolName !== undefined && st.toolName.length > 0
            ? st.toolName
            : (st.label ?? st.id).slice(0, cap);
        drawLabel(ctx, p, sx - 4, sy - 20, text.slice(0, cap), false);
      }
      for (const [id, wpos] of playerWorldPos) {
        const { x: sx, y: sy } = worldToScreen(wpos.x, wpos.y);
        const r = Math.max(6, cellScale * 0.22);
        const cx = sx + box * 0.3;
        const cy = sy + box * 0.3;
        ctx.fillStyle = p.agent;
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const lines = calloutLinesByPlayer.get(id) ?? [];
        let ty = cy - r - 10;
        for (let li = lines.length - 1; li >= 0; li -= 1) {
          const row = lines[li];
          if (row === undefined) continue;
          const line = `${row.role}: ${row.text}`.slice(0, CALLOUT_CHARS_PER_LINE);
          ctx.font = "600 11px ui-monospace, monospace";
          const tw = Math.min(280, 8 + ctx.measureText(line).width);
          ctx.fillStyle = p.calloutBg;
          fillRoundRect(ctx, cx - tw / 2, ty - 2, tw, CALLOUT_LINE_SKIP + 2, 4);
          drawLabel(ctx, p, cx - tw / 2 + 4, ty, line, false);
          ty -= CALLOUT_LINE_SKIP + 4;
        }
        const label =
          snapshot?.players.find((pl) => pl.playerId === id)?.name ?? id;
        drawLabel(ctx, p, sx, sy + box * 0.55, label.slice(0, 14), true);
      }
    },
  },
});
