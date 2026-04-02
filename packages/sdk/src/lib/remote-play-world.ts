import type {
  AddPlayerInput,
  Journey,
  RecordInteractionInput,
  RegisteredPlayer,
  WorldStructure,
  WorldStructureKind,
} from "../public-types.js";

/** Options for {@link RemotePlayWorld}: API origin and credentials for RPC calls. */
export type RemotePlayWorldOptions = {
  /** Web UI base URL (no trailing slash), e.g. `https://host` or `http://127.0.0.1:3000`. */
  baseUrl: string;
  /** Account API key when the server uses `AgentRepository`; use a non-empty placeholder if none. */
  apiKey: string;
  /** Optional bearer token for authenticated routes. */
  authToken?: string;
};

/**
 * Builds the error string thrown when {@link RemotePlayWorld}'s constructor receives an empty `apiKey`.
 *
 * @remarks **Callers:** {@link RemotePlayWorld} constructor only.
 * **Callees:** none.
 */
function formatMissingApiKeyError(): string {
  return [
    'RemotePlayWorld: options.apiKey is required.',
    "",
    "  Register an agent with `agent-play create` (after `agent-play login`) and use the printed API key.",
    "  Pass it here so addPlayer can authenticate against the server repository when Redis is enabled.",
    "  If the server has no agent repository (local dev), still pass a non-empty placeholder string.",
  ].join("\n");
}

/**
 * Strips a single trailing slash from a base URL for consistent `fetch` URL construction.
 *
 * @remarks **Callers:** {@link RemotePlayWorld} constructor.
 * **Callees:** none.
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Narrowing type guard for plain object records.
 *
 * @remarks **Callers:** JSON response parsing in {@link RemotePlayWorld.start}, {@link RemotePlayWorld.addPlayer},
 * {@link RemotePlayWorld.registerMcp}, and structure parsing helpers.
 */
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

/**
 * @remarks **Callers:** {@link parseWorldStructure}.
 */
function isWorldStructureKind(s: string): s is WorldStructureKind {
  return (STRUCTURE_KINDS as readonly string[]).includes(s);
}

/**
 * Parses one server JSON structure into {@link WorldStructure} or `null` if invalid.
 *
 * @remarks **Callers:** {@link parseStructures}.
 * **Callees:** {@link isRecord}, {@link isWorldStructureKind}.
 */
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

/**
 * Parses `structures` JSON array from `addPlayer` response.
 *
 * @remarks **Callers:** {@link RemotePlayWorld.addPlayer}.
 * **Callees:** {@link parseWorldStructure}.
 */
function parseStructures(v: unknown): WorldStructure[] {
  if (!Array.isArray(v)) return [];
  const out: WorldStructure[] = [];
  for (const x of v) {
    const row = parseWorldStructure(x);
    if (row !== null) out.push(row);
  }
  return out;
}

/**
 * Error message for invalid `seconds` in {@link RemotePlayWorld.hold}.
 *
 * @remarks **Callers:** {@link RemotePlayWorld.hold `hold().for()`} only.
 */
function formatInvalidHoldSecondsError(): string {
  return [
    "RemotePlayWorld.hold().for(seconds): seconds must be a finite number.",
    "",
    "  Example: await world.hold().for(3600)",
  ].join("\n");
}

/**
 * Return value of {@link RemotePlayWorld.hold}: a delayed promise helper for long-running processes.
 */
export type RemotePlayWorldHold = {
  /**
   * Sleeps for the given number of seconds (non-negative).
   *
   * @remarks **Callers:** integration scripts that must keep the Node process alive after `start()`.
   * **Callees:** `setTimeout` via `Promise`.
   */
  for: (seconds: number) => Promise<void>;
};

/**
 * HTTP client for Agent Play: starts a session, registers players, records journeys and
 * interactions, and syncs structures. Designed for long-running Node processes with
 * {@link RemotePlayWorld.hold `hold().for()`} to keep the process alive.
 *
 * @remarks **Callers:** user code and SDK examples. All public methods except `constructor` require
 * {@link RemotePlayWorld.start} to have succeeded first (except `start` itself).
 *
 * **Protocol:** Uses `fetch` to `GET /api/agent-play/session`, `POST /api/agent-play/players`, and
 * `POST /api/agent-play/sdk/rpc` with JSON body `{ op, payload }`, plus MCP registration
 * `POST /api/agent-play/mcp/register`.
 */
export class RemotePlayWorld {
  /** Normalized {@link RemotePlayWorldOptions.baseUrl} (no trailing slash). Used for `fetch` base. */
  private readonly apiBase: string;
  /** Trimmed account API key; sent on `addPlayer` and implied for RPC auth expectations. */
  private readonly apiKey: string;
  /** Optional bearer token merged into request headers when set. */
  private readonly authToken: string | undefined;
  /** Session id from `GET /api/agent-play/session`; `null` until {@link RemotePlayWorld.start} succeeds. */
  private sid: string | null = null;
  /** When true, {@link RemotePlayWorld.close} is a no-op and listeners already ran. */
  private closed = false;
  /** Unsubscribe callbacks registered via {@link RemotePlayWorld.onClose}. */
  private readonly closeListeners = new Set<() => void>();

  /**
   * @param options - Base URL, API key, and optional auth token.
   * @throws Error if `apiKey` is missing or whitespace-only (see {@link formatMissingApiKeyError}).
   *
   * @remarks **Callees:** {@link formatMissingApiKeyError}, {@link normalizeBaseUrl}.
   */
  constructor(options: RemotePlayWorldOptions) {
    if (typeof options.apiKey !== "string" || options.apiKey.trim().length === 0) {
      throw new Error(formatMissingApiKeyError());
    }
    this.apiBase = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey.trim();
    this.authToken = options.authToken;
  }

  /**
   * Registers a one-shot listener invoked when {@link RemotePlayWorld.close} runs (e.g. process shutdown).
   *
   * @param handler - Synchronous callback; errors are swallowed.
   * @returns Unsubscribe function that removes this `handler` from the set.
   *
   * @remarks **Callers:** user code. **Callees:** `Set.prototype.add` / `delete`.
   */
  onClose(handler: () => void): () => void {
    this.closeListeners.add(handler);
    return () => {
      this.closeListeners.delete(handler);
    };
  }

  /**
   * Returns a helper that sleeps for wall-clock seconds (useful for `await world.hold().for(3600)`).
   *
   * @remarks **Callers:** user code. **Callees:** {@link formatInvalidHoldSecondsError}.
   */
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

  /**
   * Authorization header map for requests that only need session cookie or bearer auth.
   *
   * @internal
   * @remarks **Callers:** {@link RemotePlayWorld.start}, {@link RemotePlayWorld.addPlayer} (via headers),
   * {@link RemotePlayWorld.registerMcp}, and any future GET-only calls.
   */
  private authHeaders(): Record<string, string> {
    if (this.authToken === undefined) return {};
    return { Authorization: `Bearer ${this.authToken}` };
  }

  /**
   * Headers for JSON `POST` bodies (RPC, players, MCP).
   *
   * @internal
   * @remarks **Callers:** {@link RemotePlayWorld.addPlayer}, {@link RemotePlayWorld.rpc}, {@link RemotePlayWorld.registerMcp}.
   * **Callees:** {@link authHeaders}.
   */
  private jsonHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...this.authHeaders(),
    };
  }

  /**
   * Creates a session and stores `sid` from `GET /api/agent-play/session`.
   *
   * @throws Error if the response is not OK or JSON lacks a non-empty `sid` string.
   *
   * @remarks **Callers:** user code. **Callees:** `fetch`, {@link isRecord}.
   */
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

  /**
   * Marks the client closed and invokes all {@link onClose} listeners once.
   *
   * @remarks **Callers:** user code. **Callees:** `Array.from` over {@link closeListeners}.
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const handler of Array.from(this.closeListeners)) {
      try {
        handler();
      } catch {
        // ignore listener errors
      }
    }
  }

  /**
   * @returns Current session id.
   * @throws Error if {@link RemotePlayWorld.start} has not been called successfully.
   *
   * @remarks **Callers:** user code. **Callees:** none.
   */
  getSessionId(): string {
    if (this.sid === null) {
      throw new Error("RemotePlayWorld.start() must be called first");
    }
    return this.sid;
  }

  /**
   * @returns Absolute watch URL for the session (`/agent-play/watch` on `apiBase`). Query `sid` is not appended;
   * consumers append `?sid=` from {@link getSessionId} when needed.
   *
   * @remarks **Callers:** user code. **Callees:** `URL` constructor.
   */
  getPreviewUrl(): string {
    const u = new URL("/agent-play/watch", this.apiBase);
    u.search = "";
    return u.toString();
  }

  /**
   * Registers a player agent with the server for the current session.
   *
   * @param input - Name, type, `agent` registration from {@link langchainRegistration}, optional `agentId`.
   * @returns Resolved player row with `previewUrl` and `structures`.
   * @throws Error on HTTP errors or malformed JSON.
   *
   * @remarks **Callers:** user code. **Callees:** {@link getSessionId}, `fetch`, `JSON.parse`, {@link parseStructures}.
   */
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

  /**
   * Appends a chat-style interaction line for a player (RPC `recordInteraction`).
   *
   * @remarks **Callers:** user code. **Callees:** {@link rpc}.
   */
  async recordInteraction(input: RecordInteractionInput): Promise<void> {
    await this.rpc("recordInteraction", {
      playerId: input.playerId,
      role: input.role,
      text: input.text,
    });
  }

  /**
   * Records a full journey for a player (RPC `recordJourney`).
   *
   * @remarks **Callers:** user code. **Callees:** {@link rpc}.
   */
  async recordJourney(playerId: string, journey: Journey): Promise<void> {
    await this.rpc("recordJourney", { playerId, journey });
  }

  /**
   * Re-syncs layout structures from an ordered tool name list (RPC `syncPlayerStructuresFromTools`).
   *
   * @remarks **Callers:** user code. **Callees:** {@link rpc}.
   */
  async syncPlayerStructuresFromTools(
    playerId: string,
    toolNames: string[]
  ): Promise<void> {
    await this.rpc("syncPlayerStructuresFromTools", { playerId, toolNames });
  }

  /**
   * Registers an MCP server metadata row for the session (HTTP POST, not the same as RPC `op`).
   *
   * @returns New registration id string from JSON `{ id }`.
   *
   * @remarks **Callers:** user code. **Callees:** `fetch`, {@link getSessionId}, {@link jsonHeaders}.
   */
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

  /**
   * Posts `{ op, payload }` to `/api/agent-play/sdk/rpc?sid=...`.
   *
   * @internal
   * @remarks **Callers:** {@link recordInteraction}, {@link recordJourney}, {@link syncPlayerStructuresFromTools}.
   * **Callees:** {@link getSessionId}, `fetch`, {@link jsonHeaders}.
   */
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
