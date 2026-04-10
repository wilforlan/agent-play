import type {
  AddAgentInput,
  AddPlayerInput,
  AgentPlaySnapshot,
  AgentPlayWorldMap,
  AgentPlayWorldMapBounds,
  Journey,
  RecordInteractionInput,
  RegisteredAgentSummary,
  RegisteredPlayer,
  PlayerChainNodeResponse,
} from "../public-types.js";
import { agentPlayDebug } from "./agent-play-debug.js";
import {
  SESSION_CLOSED_EVENT,
  SESSION_CONNECTED_EVENT,
  type RemotePlayWorldSessionEvent,
} from "../world-events.js";
import {
  deriveNodeIdFromPassword,
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  nodeCredentialsMaterialFromHumanPassphrase,
  resolveAgentPlayCredentialsPath,
} from "@agent-play/node-tools";
import {
  parseHumanOccupantRow,
  parseAgentOccupantRow,
  parseMcpOccupantRow,
} from "./parse-occupant-row.js";
import {
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
} from "./player-chain-merge.js";

/**
 * Root key (from `.root`) plus **human** passphrase as stored in **`~/.agent-play/credentials.json`**
 * after **`agent-play create-main-node`**. Material for node id and wire auth is
 * **`nodeCredentialsMaterialFromHumanPassphrase(passw)`** (SHA-256 hex; same as CLI **`hashNodePassword`**).
 */
export type RemotePlayWorldNodeCredentials = {
  rootKey: string;
  passw: string;
};

export type RemotePlayWorldOptions = {
  baseUrl?: string;
  /**
   * `rootKey` from `.root` and **`passw`** human phrase from **`credentials.json`** (see **`loadAgentPlayCredentialsFileFromPathSync`** in **@agent-play/node-tools**).
   */
  nodeCredentials?: RemotePlayWorldNodeCredentials;
  /** Called for session lifecycle events (`session:connected`, `session:closed`; see `world-events`). */
  onSessionEvent?: (event: RemotePlayWorldSessionEvent) => void;
};

/** Options for {@link RemotePlayWorld.connect}. */
export type RemotePlayWorldConnectOptions = {
  /**
   * Parent **main** node id. When set, `connect` runs `POST /api/nodes/validate` first, then `GET /api/agent-play/session`.
   * When omitted, only `GET /api/agent-play/session` runs.
   */
  mainNodeId?: string;
};

function formatMissingCredentialsError(): string {
  return [
    "RemotePlayWorld: provide nodeCredentials: { rootKey, passw },",
    "or run agent-play create-main-node so ~/.agent-play/credentials.json exists.",
  ].join(" ");
}

function formatMissingBaseUrlError(): string {
  return [
    "RemotePlayWorld: baseUrl is missing.",
    "Provide options.baseUrl, or ensure credentials.json contains serverUrl.",
  ].join(" ");
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseBounds(raw: unknown): AgentPlayWorldMapBounds {
  if (!isRecord(raw)) {
    throw new Error("getWorldSnapshot: worldMap.bounds must be an object");
  }
  const { minX, minY, maxX, maxY } = raw;
  if (
    typeof minX !== "number" ||
    typeof minY !== "number" ||
    typeof maxX !== "number" ||
    typeof maxY !== "number"
  ) {
    throw new Error(
      "getWorldSnapshot: bounds need numeric minX, minY, maxX, maxY"
    );
  }
  return { minX, minY, maxX, maxY };
}

function parseWorldMap(raw: unknown): AgentPlayWorldMap {
  if (!isRecord(raw)) {
    throw new Error("getWorldSnapshot: worldMap must be an object");
  }
  const bounds = parseBounds(raw.bounds);
  const occ = raw.occupants;
  if (!Array.isArray(occ)) {
    throw new Error("getWorldSnapshot: worldMap.occupants must be an array");
  }
  const occupants: AgentPlayWorldMap["occupants"] = [];
  const coordKeys = new Set<string>();
  for (const row of occ) {
    if (
      !isRecord(row) ||
      (row.kind !== "human" && row.kind !== "agent" && row.kind !== "mcp")
    ) {
      throw new Error(
        "getWorldSnapshot: each occupant must have kind human, agent, or mcp"
      );
    }
    const xy =
      typeof row.x === "number" && typeof row.y === "number"
        ? `${row.x},${row.y}`
        : "";
    if (xy.length === 0) {
      throw new Error("getWorldSnapshot: occupant missing coordinates");
    }
    if (coordKeys.has(xy)) {
      throw new Error("getWorldSnapshot: duplicate world map coordinate");
    }
    coordKeys.add(xy);
    if (row.kind === "human") {
      occupants.push(parseHumanOccupantRow(row));
    } else if (row.kind === "agent") {
      occupants.push(parseAgentOccupantRow(row));
    } else {
      occupants.push(parseMcpOccupantRow(row));
    }
  }
  return { bounds, occupants };
}

function parseAgentPlaySnapshot(snapshot: unknown): AgentPlaySnapshot {
  if (!isRecord(snapshot) || typeof snapshot.sid !== "string") {
    throw new Error("getWorldSnapshot: invalid snapshot");
  }
  const worldMap = parseWorldMap(snapshot.worldMap);
  const out: AgentPlaySnapshot = { sid: snapshot.sid, worldMap };
  if ("mcpServers" in snapshot && Array.isArray(snapshot.mcpServers)) {
    const servers: NonNullable<AgentPlaySnapshot["mcpServers"]> = [];
    for (const m of snapshot.mcpServers) {
      if (!isRecord(m) || typeof m.id !== "string" || typeof m.name !== "string") {
        continue;
      }
      const row: { id: string; name: string; url?: string } = {
        id: m.id,
        name: m.name,
      };
      if (typeof m.url === "string") row.url = m.url;
      servers.push(row);
    }
    if (servers.length > 0) out.mcpServers = servers;
  }
  return out;
}

function parseRegisteredAgentSummary(raw: unknown): RegisteredAgentSummary {
  if (!isRecord(raw)) {
    throw new Error("registerAgent: registeredAgent missing");
  }
  if (typeof raw.agentId !== "string" || typeof raw.name !== "string") {
    throw new Error("registerAgent: registeredAgent.agentId and name required");
  }
  if (!Array.isArray(raw.toolNames)) {
    throw new Error("registerAgent: registeredAgent.toolNames must be an array");
  }
  const toolNames: string[] = [];
  for (const t of raw.toolNames) {
    if (typeof t !== "string") {
      throw new Error("registerAgent: registeredAgent.toolNames must be strings");
    }
    toolNames.push(t);
  }
  if (
    typeof raw.zoneCount !== "number" ||
    typeof raw.yieldCount !== "number" ||
    typeof raw.flagged !== "boolean"
  ) {
    throw new Error("registerAgent: registeredAgent counters invalid");
  }
  return {
    agentId: raw.agentId,
    name: raw.name,
    toolNames,
    zoneCount: raw.zoneCount,
    yieldCount: raw.yieldCount,
    flagged: raw.flagged,
  };
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

/**
 * HTTP client for the Agent Play web UI: session, snapshot RPC, mutating RPC with `sid`, and optional SSE subscription.
 *
 * Authenticates like the CLI: **`x-node-id`** (derived node id) and **`x-node-passw`** (hashed passphrase material) on every request.
 *
 * Register automation agents with {@link RemotePlayWorld.addAgent} (`nodeId` is the agent node id; the server stores it as `agentId`).
 *
 * Incremental updates: {@link RemotePlayWorld.subscribeWorldState} listens for **`playerChainNotify`** in SSE `data`, then fetches each changed leaf via {@link RemotePlayWorld.getPlayerChainNode} and merges with {@link mergeSnapshotWithPlayerChainNode}.
 */
export class RemotePlayWorld {
  private readonly apiBase: string;
  private readonly rootKey: string;
  /** Node id derived from hashed passphrase material + root (main or agent node id). */
  private readonly derivedNodeId: string;
  /** Hex password material (`hashNodePassword` on normalized human phrase); sent as `password` for repository addAgent. */
  private readonly password: string;
  private readonly onSessionEvent:
    | ((event: RemotePlayWorldSessionEvent) => void)
    | undefined;
  private sid: string | null = null;
  private closed = false;
  private readonly closeListeners = new Set<() => void>();

  constructor(options: RemotePlayWorldOptions = {}) {
    const creds = loadAgentPlayCredentialsFileFromPathSync(
      resolveAgentPlayCredentialsPath()
    );
    const resolvedBaseUrl = options.baseUrl ?? creds?.serverUrl;
    if (resolvedBaseUrl === undefined || resolvedBaseUrl.trim().length === 0) {
      throw new Error(formatMissingBaseUrlError());
    }
    this.apiBase = normalizeBaseUrl(resolvedBaseUrl);
    this.onSessionEvent = options.onSessionEvent;

    const nc =
      options.nodeCredentials ??
      (creds === null ? undefined : { rootKey: loadRootKey(), passw: creds.passw });
    if (
      nc !== undefined &&
      typeof nc.rootKey === "string" &&
      nc.rootKey.trim().length > 0 &&
      typeof nc.passw === "string" &&
      nc.passw.length > 0
    ) {
      this.rootKey = nc.rootKey.trim().toLowerCase();
      const material = nodeCredentialsMaterialFromHumanPassphrase(nc.passw);
      this.password = material;
      this.derivedNodeId = deriveNodeIdFromPassword({
        password: material,
        rootKey: this.rootKey,
      });
      return;
    }

    throw new Error(formatMissingCredentialsError());
  }

  private emitSessionEvent(event: RemotePlayWorldSessionEvent): void {
    this.onSessionEvent?.(event);
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
    return {
      "x-node-id": this.derivedNodeId,
      "x-node-passw": this.password,
    };
  }

  private jsonHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...this.authHeaders(),
    };
  }

  private mergeAuthFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    const auth = this.authHeaders();
    for (const [k, v] of Object.entries(auth)) {
      headers.set(k, v);
    }
    return fetch(input, { ...init, headers });
  }

  private async validateNodeIdentity(options: {
    nodeId: string;
    mainNodeId: string | undefined;
  }): Promise<{ nodeKind?: string }> {
    const body: { nodeId: string; rootKey: string; mainNodeId?: string } = {
      nodeId: options.nodeId,
      rootKey: this.rootKey,
    };
    if (options.mainNodeId !== undefined && options.mainNodeId.trim().length > 0) {
      body.mainNodeId = options.mainNodeId.trim();
    }
    const res = await fetch(`${this.apiBase}/api/nodes/validate`, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify(body),
    });
    let json: unknown;
    try {
      json = (await res.json()) as unknown;
    } catch {
      throw new Error(`node validation failed: ${String(res.status)} invalid JSON`);
    }
    if (!isRecord(json) || json.ok !== true) {
      const reason =
        isRecord(json) && typeof json.reason === "string" ? json.reason : `HTTP ${String(res.status)}`;
      throw new Error(`node validation failed: ${reason}`);
    }
    const nodeKind =
      isRecord(json) && typeof json.nodeKind === "string" ? json.nodeKind : undefined;
    agentPlayDebug("remote-play-world", "node identity validated", {
      nodeKind,
      derivedNodeIdPrefix: `${this.derivedNodeId.slice(0, 8)}…`,
    });
    return nodeKind !== undefined ? { nodeKind } : {};
  }

  /**
   * Establishes the HTTP session via `GET /api/agent-play/session`. With {@link RemotePlayWorldConnectOptions.mainNodeId},
   * validates node identity with `POST /api/nodes/validate` first.
   */
  async connect(options?: RemotePlayWorldConnectOptions): Promise<void> {
    const mainNodeIdOpt = options?.mainNodeId?.trim();
    if (mainNodeIdOpt !== undefined && mainNodeIdOpt.length > 0) {
      const validation = await this.validateNodeIdentity({
        nodeId: this.derivedNodeId,
        mainNodeId: mainNodeIdOpt,
      });
      console.info(
        `[agent-play] Node identity validated (${validation.nodeKind ?? "unknown"}).`
      );
    }
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
    this.emitSessionEvent({
      name: SESSION_CONNECTED_EVENT,
      detail: { sid: this.sid },
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.emitSessionEvent({ name: SESSION_CLOSED_EVENT });
    for (const handler of Array.from(this.closeListeners)) {
      try {
        handler();
      } catch {
        // ignore listener errors
      }
    }
  }

  getSessionId(): string {
    if (this.sid === null) {
      throw new Error("RemotePlayWorld.connect() must be called first");
    }
    return this.sid;
  }

  getPreviewUrl(): string {
    const u = new URL("/agent-play/watch", this.apiBase);
    u.search = "";
    return u.toString();
  }

  async getWorldSnapshot(): Promise<AgentPlaySnapshot> {
    const res = await fetch(`${this.apiBase}/api/agent-play/sdk/rpc`, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({ op: "getWorldSnapshot", payload: {} }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`getWorldSnapshot: ${res.status} ${text}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("getWorldSnapshot: invalid JSON");
    }
    if (!isRecord(json) || !("snapshot" in json)) {
      throw new Error("getWorldSnapshot: invalid response shape");
    }
    return parseAgentPlaySnapshot(json.snapshot);
  }

  /**
   * Fetches one player-chain node (genesis, header, occupant row, or removal) for `stableKey`, same snapshot scope as {@link RemotePlayWorld.getWorldSnapshot}.
   */
  async getPlayerChainNode(stableKey: string): Promise<PlayerChainNodeResponse> {
    const trimmed = stableKey.trim();
    if (trimmed.length === 0) {
      throw new Error("getPlayerChainNode: stableKey is required");
    }
    const res = await fetch(`${this.apiBase}/api/agent-play/sdk/rpc`, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        op: "getPlayerChainNode",
        payload: { stableKey: trimmed },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`getPlayerChainNode: ${res.status} ${text}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("getPlayerChainNode: invalid JSON");
    }
    return parsePlayerChainNodeRpcBody(json);
  }

  /**
   * Opens the session SSE stream, emits an initial snapshot from {@link RemotePlayWorld.getWorldSnapshot}, then on each **`playerChainNotify`** merges nodes in deterministic order via {@link RemotePlayWorld.getPlayerChainNode}.
   */
  subscribeWorldState(callbacks: {
    onSnapshot: (snapshot: AgentPlaySnapshot) => void;
    onError?: (err: Error) => void;
  }): { close: () => void } {
    let closeSource: (() => void) | null = null;
    const task = (async () => {
      try {
        const { createEventSource } = await import("eventsource-client");
        let snapshot = await this.getWorldSnapshot();
        callbacks.onSnapshot(snapshot);
        const source = createEventSource({
          url: `${this.apiBase}/api/agent-play/events?sid=${encodeURIComponent(
            this.getSessionId()
          )}`,
          fetch: (input, init) => this.mergeAuthFetch(input, init),
        });
        closeSource = () => {
          source.close();
        };
        for await (const msg of source) {
          if (typeof msg.data !== "string") {
            continue;
          }
          let data: unknown;
          try {
            data = JSON.parse(msg.data) as unknown;
          } catch {
            continue;
          }
          const notify = parsePlayerChainFanoutNotifyFromSsePayload(data);
          if (notify === undefined || notify.nodes.length === 0) {
            continue;
          }
          const ordered = sortNodeRefsForSerializedFetch(notify.nodes);
          for (const ref of ordered) {
            const node = await this.getPlayerChainNode(ref.stableKey);
            snapshot = mergeSnapshotWithPlayerChainNode(snapshot, node);
          }
          callbacks.onSnapshot(snapshot);
        }
      } catch (e) {
        callbacks.onError?.(
          e instanceof Error ? e : new Error(String(e))
        );
      }
    })();
    return {
      close: () => {
        closeSource?.();
        void task;
      },
    };
  }

  /**
   * Registers an automation agent using **agent node id** (`nodeId`), sent to the server as `agentId`.
   */
  async addAgent(input: AddAgentInput): Promise<RegisteredPlayer> {
    const sid = this.getSessionId();
    const effectiveMainNodeId = this.derivedNodeId;
    const validation = await this.validateNodeIdentity({
      nodeId: input.nodeId,
      mainNodeId: effectiveMainNodeId,
    });
    console.info(
      [
        "Agent Node Connection",
        `  status   : validated`,
        `  nodeId   : ${input.nodeId}`,
        `  nodeKind : ${validation.nodeKind ?? "unknown"}`,
        `  mainNode : ${effectiveMainNodeId}`,
      ].join("\n")
    );
    const url = `${this.apiBase}/api/agent-play/players?sid=${encodeURIComponent(sid)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        name: input.name,
        type: input.type,
        agent: input.agent,
        mainNodeId: effectiveMainNodeId,
        password: this.password,
        agentId: input.nodeId,
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`addAgent: ${res.status} ${bodyText}`);
    }
    let body: unknown;
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error("addAgent: invalid JSON");
    }
    if (!isRecord(body)) {
      throw new Error("addAgent: invalid response shape");
    }
    const playerId = body.playerId;
    const previewUrl = body.previewUrl;
    if (typeof playerId !== "string" || typeof previewUrl !== "string") {
      throw new Error("addAgent: missing playerId or previewUrl");
    }
    const registeredAgent = parseRegisteredAgentSummary(body.registeredAgent);
    const now = new Date();
    return {
      id: playerId,
      name: input.name,
      sid,
      createdAt: now,
      updatedAt: now,
      previewUrl,
      registeredAgent,
    };
  }

  /**
   * @deprecated Use {@link addAgent} with `nodeId` (agent node id) for integrations and automation.
   */
  async addPlayer(input: AddPlayerInput): Promise<RegisteredPlayer> {
    const payload: AddAgentInput = {
      name: input.name,
      type: input.type,
      agent: input.agent,
      nodeId: input.agentId,
    };
    if (input.version !== undefined) {
      payload.version = input.version;
    }
    if (input.createdAt !== undefined) {
      payload.createdAt = input.createdAt;
    }
    if (input.updatedAt !== undefined) {
      payload.updatedAt = input.updatedAt;
    }
    if (input.mainNodeId !== undefined) {
      payload.mainNodeId = input.mainNodeId;
    }
    return this.addAgent(payload);
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
