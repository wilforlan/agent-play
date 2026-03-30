import type {
  AddPlayerInput,
  Journey,
  RecordInteractionInput,
  RegisteredPlayer,
  WorldStructure,
  WorldStructureKind,
} from "../public-types.js";

export type RemotePlayWorldOptions = {
  baseUrl: string;
  apiKey: string;
  authToken?: string;
};

function formatMissingApiKeyError(): string {
  return [
    'RemotePlayWorld: options.apiKey is required.',
    "",
    "  Register an agent with `agent-play create` (after `agent-play login`) and use the printed API key.",
    "  Pass it here so addPlayer can authenticate against the server repository when Redis is enabled.",
    "  If the server has no agent repository (local dev), still pass a non-empty placeholder string.",
  ].join("\n");
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
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

function formatInvalidHoldSecondsError(): string {
  return [
    "RemotePlayWorld.hold().for(seconds): seconds must be a finite number.",
    "",
    "  Example: await world.hold().for(3600)",
  ].join("\n");
}

export type RemotePlayWorldHold = {
  for: (seconds: number) => Promise<void>;
};

export class RemotePlayWorld {
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly authToken: string | undefined;
  private sid: string | null = null;
  private closed = false;
  private readonly closeListeners = new Set<() => void>();

  constructor(options: RemotePlayWorldOptions) {
    if (typeof options.apiKey !== "string" || options.apiKey.trim().length === 0) {
      throw new Error(formatMissingApiKeyError());
    }
    this.apiBase = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey.trim();
    this.authToken = options.authToken;
  }

  onClose(handler: () => void): () => void {
    this.closeListeners.add(handler);
    return () => {
      this.closeListeners.delete(handler);
    };
  }

  hold(): RemotePlayWorldHold {
    return {
      for: async (seconds: number) => {
        if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
          throw new Error(formatInvalidHoldSecondsError());
        }
        const ms = Math.max(0, seconds) * 1000;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        });
      },
    };
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
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const handler of [...this.closeListeners]) {
      try {
        handler();
      } catch {
        // ignore listener errors
      }
    }
  }

  getSessionId(): string {
    if (this.sid === null) {
      throw new Error("RemotePlayWorld.start() must be called first");
    }
    return this.sid;
  }

  getPreviewUrl(): string {
    const u = new URL("/agent-play/watch", this.apiBase);
    u.search = "";
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
        apiKey: this.apiKey,
        agentId: input.agentId,
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
}
