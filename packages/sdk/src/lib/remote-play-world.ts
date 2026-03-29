import { EventEmitter } from "node:events";
import WebSocket from "ws";
import type {
  AddPlayerInput,
  Journey,
  RecordInteractionInput,
  RegisteredPlayer,
  WorldJourneyUpdate,
  WorldStructure,
  WorldStructureKind,
} from "../public-types.js";
import { WORLD_JOURNEY_EVENT } from "../world-events.js";

export type RemotePlayWorldOptions = {
  baseUrl: string;
  wsPath?: string;
  connectWebSocket?: boolean;
  authToken?: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function toWebSocketUrl(httpBase: string, wsPath: string): string {
  const u = new URL(httpBase.includes("://") ? httpBase : `http://${httpBase}`);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = wsPath;
  u.search = "";
  u.hash = "";
  return u.toString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const STRUCTURE_KINDS: readonly WorldStructureKind[] = [
  "home",
  "tool",
  "api",
  "database",
  "model",
];

function isWorldStructureKind(s: string): s is WorldStructureKind {
  return (STRUCTURE_KINDS as readonly string[]).includes(s);
}

function parseWorldStructure(x: unknown): WorldStructure | null {
  if (!isRecord(x)) return null;
  if (typeof x.id !== "string" || typeof x.kind !== "string") return null;
  if (!isWorldStructureKind(x.kind)) return null;
  if (typeof x.x !== "number" || typeof x.y !== "number") return null;
  const out: WorldStructure = {
    id: x.id,
    kind: x.kind,
    x: x.x,
    y: x.y,
  };
  if (typeof x.toolName === "string") out.toolName = x.toolName;
  if (typeof x.label === "string") out.label = x.label;
  return out;
}

function parseStructures(v: unknown): WorldStructure[] {
  if (!Array.isArray(v)) return [];
  const out: WorldStructure[] = [];
  for (const x of v) {
    const row = parseWorldStructure(x);
    if (row !== null) out.push(row);
  }
  return out;
}

export class RemotePlayWorld extends EventEmitter {
  private readonly apiBase: string;
  private readonly wsPath: string;
  private readonly connectWebSocket: boolean;
  private readonly authToken: string | undefined;
  private sid: string | null = null;
  private ws: WebSocket | null = null;

  constructor(options: RemotePlayWorldOptions) {
    super();
    this.apiBase = normalizeBaseUrl(options.baseUrl);
    this.wsPath = options.wsPath ?? "/ws/agent-play";
    this.connectWebSocket = options.connectWebSocket !== false;
    this.authToken = options.authToken;
  }

  private authHeaders(): Record<string, string> {
    if (this.authToken === undefined) return {};
    return { Authorization: `Bearer ${this.authToken}` };
  }

  private jsonHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...this.authHeaders(),
    };
  }

  async start(): Promise<void> {
    const res = await fetch(`${this.apiBase}/api/agent-play/session`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`session failed: ${res.status}`);
    }
    const json: unknown = await res.json();
    if (!isRecord(json) || typeof json.sid !== "string" || json.sid.length === 0) {
      throw new Error("session: invalid response");
    }
    this.sid = json.sid;
    if (this.connectWebSocket) {
      this.connectWs();
    }
  }

  private connectWs(): void {
    const url = toWebSocketUrl(this.apiBase, this.wsPath);
    const ws =
      this.authToken !== undefined
        ? new WebSocket(url, {
            headers: { Authorization: `Bearer ${this.authToken}` },
          })
        : new WebSocket(url);
    this.ws = ws;
    ws.on("message", (data: WebSocket.RawData) => {
      const text = typeof data === "string" ? data : data.toString();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        return;
      }
      if (!isRecord(parsed) || typeof parsed.event !== "string") return;
      this.emit(parsed.event, parsed.payload);
    });
    ws.on("close", () => {
      this.ws = null;
    });
  }

  async close(): Promise<void> {
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSessionId(): string {
    if (this.sid === null) {
      throw new Error("RemotePlayWorld.start() must be called first");
    }
    return this.sid;
  }

  getPreviewUrl(): string {
    const sid = this.getSessionId();
    const u = new URL("/agent-play/watch", this.apiBase);
    u.searchParams.set("sid", sid);
    return u.toString();
  }

  async addPlayer(input: AddPlayerInput): Promise<RegisteredPlayer> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/players?sid=${encodeURIComponent(sid)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        name: input.name,
        type: input.type,
        agent: input.agent,
        apiKey: input.apiKey,
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`addPlayer: ${res.status} ${bodyText}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error("addPlayer: invalid JSON");
    }
    if (!isRecord(json)) {
      throw new Error("addPlayer: invalid response shape");
    }
    const playerId = json.playerId;
    const previewUrl = json.previewUrl;
    if (typeof playerId !== "string" || typeof previewUrl !== "string") {
      throw new Error("addPlayer: missing playerId or previewUrl");
    }
    const structures = parseStructures(json.structures);
    const now = new Date();
    return {
      id: playerId,
      name: input.name,
      sid,
      createdAt: now,
      updatedAt: now,
      previewUrl,
      structures,
    };
  }

  async recordInteraction(input: RecordInteractionInput): Promise<void> {
    await this.rpc("recordInteraction", {
      playerId: input.playerId,
      role: input.role,
      text: input.text,
    });
  }

  async recordJourney(playerId: string, journey: Journey): Promise<void> {
    await this.rpc("recordJourney", { playerId, journey });
  }

  async syncPlayerStructuresFromTools(
    playerId: string,
    toolNames: string[]
  ): Promise<void> {
    await this.rpc("syncPlayerStructuresFromTools", { playerId, toolNames });
  }

  async ingestInvokeResult(
    playerId: string,
    invokeResult: unknown
  ): Promise<void> {
    await this.rpc("ingestInvokeResult", { playerId, invokeResult });
  }

  async registerMcp(options: { name: string; url?: string }): Promise<string> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/mcp/register?sid=${encodeURIComponent(sid)}`;
    const body: { name: string; url?: string } = { name: options.name };
    if (options.url !== undefined) {
      body.url = options.url;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`registerMcp: ${res.status} ${text}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("registerMcp: invalid JSON");
    }
    if (!isRecord(json) || typeof json.id !== "string") {
      throw new Error("registerMcp: invalid response");
    }
    return json.id;
  }

  private async rpc(op: string, payload: unknown): Promise<void> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(sid)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({ op, payload }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`rpc ${op}: ${res.status} ${t}`);
    }
  }

  onWorldJourney(listener: (update: WorldJourneyUpdate) => void): void {
    this.on(WORLD_JOURNEY_EVENT, listener);
  }
}
