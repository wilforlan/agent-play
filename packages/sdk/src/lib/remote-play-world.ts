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
import { randomUUID } from "node:crypto";
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
import { HumanMessage } from "@langchain/core/messages";
import {
  INTERCOM_RESPONSE_OP,
  type IntercomResponsePayload,
  parseWorldIntercomEventPayload,
  type WorldIntercomEventPayload,
  WORLD_INTERCOM_EVENT,
} from "@agent-play/intercom";
import { intercomResultRecordFromLangChainInvokeOutput } from "./intercom-langchain-chat-result.js";

const PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS = 10;
const PLAYER_CONNECTION_HEARTBEAT_RETRY_DELAY_MS = 10_000;

/**
 * Root key (from `.root`) plus **human** passphrase as stored in **`~/.agent-play/credentials.json`**
 * after **`agent-play create-main-node`**. Material for node id and wire auth is
 * **`nodeCredentialsMaterialFromHumanPassphrase(passw)`** (SHA-256 hex; same as CLI **`hashNodePassword`**).
 */
export type RemotePlayWorldNodeCredentials = {
  rootKey: string;
  passw: string;
};

export type RemotePlayWorldLogging = "off" | "on";

export type RemotePlayWorldOptions = {
  baseUrl?: string;
  /**
   * `rootKey` from `.root` and **`passw`** human phrase from **`credentials.json`** (see **`loadAgentPlayCredentialsFileFromPathSync`** in **@agent-play/node-tools**).
   */
  nodeCredentials?: RemotePlayWorldNodeCredentials;
  /** Called for session lifecycle events (`session:connected`, `session:closed`; see `world-events`). */
  onSessionEvent?: (event: RemotePlayWorldSessionEvent) => void;
  /**
   * When **`"on"`**, prints **`console.info`** lines for session events, SSE messages, intercom command matching/skips, and **`sendIntercomResponse`** payloads (for request tracing). Default **`"off"`**.
   */
  logging?: RemotePlayWorldLogging;
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

export type IntercomToolExecutor = (input: {
  toolName: string;
  args: Record<string, unknown>;
}) => Record<string, unknown> | Promise<Record<string, unknown>>;

type SubscribeIntercomChatAgents = {
  /**
   * Same LangChain agent instances passed to **`langchainRegistration`** (e.g. **`createAgent`** return values).
   * For **`kind: chat`**, **`invoke({ messages: [HumanMessage(text)] })`** is called with **`.call(agent, input)`** (no wrapping).
   */
  chatAgentsByPlayerId?: ReadonlyMap<string, unknown>;
};

export type SubscribeIntercomCommandsOptions =
  | ({ playerId: string; executeTool: IntercomToolExecutor } & SubscribeIntercomChatAgents)
  | ({ playerIds: readonly string[]; executeTool: IntercomToolExecutor } &
      SubscribeIntercomChatAgents);

function getSseEventName(msg: unknown): string | undefined {
  if (typeof msg !== "object" || msg === null) {
    return undefined;
  }
  const m = msg as Record<string, unknown>;
  if (typeof m.event === "string" && m.event.length > 0) {
    return m.event;
  }
  if (typeof m.type === "string" && m.type.length > 0) {
    return m.type;
  }
  return undefined;
}

function invokeLangChainChatAgent(
  agent: unknown,
  input: unknown
): Promise<unknown> {
  if (typeof agent !== "object" || agent === null) {
    throw new Error("intercom: chat agent must be a non-null object");
  }
  const inv = (agent as { invoke?: unknown }).invoke;
  if (typeof inv !== "function") {
    throw new Error("intercom: chat agent must have invoke()");
  }
  return Promise.resolve(
    (inv as (this: unknown, i: unknown) => unknown).call(agent, input)
  );
}

function normalizeIntercomSubscribePlayerIds(
  options: SubscribeIntercomCommandsOptions
): Set<string> {
  const raw =
    "playerIds" in options ? [...options.playerIds] : [options.playerId];
  return new Set(
    raw.map((id) => id.trim()).filter((id) => id.length > 0)
  );
}

/**
 * HTTP client for the Agent Play web UI: session, snapshot RPC, mutating RPC with `sid`, and optional SSE subscription.
 *
 * Authenticates like the CLI: **`x-node-id`** (derived node id) and **`x-node-passw`** (hashed passphrase material) on every request.
 *
 * Register automation agents with {@link RemotePlayWorld.addAgent} (`nodeId` is the agent node id; the server stores it as `agentId`).
 *
 * Incremental updates: {@link RemotePlayWorld.subscribeWorldState} listens for **`playerChainNotify`** in SSE `data`, then fetches each changed leaf via {@link RemotePlayWorld.getPlayerChainNode} and merges with {@link mergeSnapshotWithPlayerChainNode}.
 *
 * Human→agent intercom (Assist/Chat from the watch UI) is delivered as SSE **`world:intercom`** payloads with status **`forwarded`**. Call {@link RemotePlayWorld.subscribeIntercomCommands} with **`playerId`** or **`playerIds`** (one SSE stream; routes **`forwarded`** commands by **`toPlayerId`**) so your process runs tools and posts **`intercomResponse`** via {@link RemotePlayWorld.sendIntercomResponse} (the subscription does this when **`executeTool`** resolves).
 *
 * Set **`logging: "on"`** to trace **`forwarded`** commands for subscribed ids and **`sendIntercomResponse`** HTTP results.
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
  private readonly transportLog: boolean;
  private sid: string | null = null;
  private closed = false;
  private readonly closeListeners = new Set<() => void>();
  private readonly playerConnectionInfo = new Map<
    string,
    { connectionId: string; leaseTtlSeconds: number; timer: ReturnType<typeof setInterval> }
  >();

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
    this.transportLog = options.logging === "on";

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

  private logTransport(event: string, detail: Record<string, unknown>): void {
    if (!this.transportLog) {
      return;
    }
    console.info(`[agent-play:RemotePlayWorld] ${event}`, detail);
  }

  private truncateForLog(value: string, max = 1600): string {
    return value.length <= max ? value : `${value.slice(0, max)}…`;
  }

  private emitSessionEvent(event: RemotePlayWorldSessionEvent): void {
    this.logTransport("session:event", {
      name: event.name,
      detail: event.detail ?? {},
    });
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
    this.logTransport("connect:session", {
      sid: this.sid,
      apiBase: this.apiBase,
    });
    this.emitSessionEvent({
      name: SESSION_CONNECTED_EVENT,
      detail: { sid: this.sid },
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    for (const [playerId, connection] of this.playerConnectionInfo.entries()) {
      clearInterval(connection.timer);
      try {
        await this.disconnectPlayerConnection({
          playerId,
          connectionId: connection.connectionId,
        });
      } catch {
        // ignore disconnect errors during close
      }
    }
    this.playerConnectionInfo.clear();
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
    onIntercomEvent?: (payload: WorldIntercomEventPayload) => void;
  }): { close: () => void } {
    let closeSource: (() => void) | null = null;
    const task = (async () => {
      try {
        const { createEventSource } = await import("eventsource-client");
        let snapshot = await this.getWorldSnapshot();
        callbacks.onSnapshot(snapshot);
        const sseUrl = `${this.apiBase}/api/agent-play/events?sid=${encodeURIComponent(
          this.getSessionId()
        )}`;
        this.logTransport("subscribeWorldState:sse_open", { sseUrl });
        const source = createEventSource({
          url: sseUrl,
          fetch: (input, init) => this.mergeAuthFetch(input, init),
        });
        closeSource = () => {
          source.close();
        };
        for await (const msg of source) {
          const eventType =
            typeof msg === "object" &&
            msg !== null &&
            "type" in msg &&
            typeof (msg as { type?: unknown }).type === "string"
              ? (msg as { type: string }).type
              : "(no type)";
          if (typeof msg.data !== "string") {
            this.logTransport("sse:worldState:skip", {
              reason: "data_not_string",
              eventType,
            });
            continue;
          }
          this.logTransport("sse:worldState:message", {
            eventType,
            dataLength: msg.data.length,
            dataPreview: this.truncateForLog(msg.data),
          });
          let data: unknown;
          try {
            data = JSON.parse(msg.data) as unknown;
          } catch {
            this.logTransport("sse:worldState:parseJson", {
              reason: "invalid_json",
              eventType,
            });
            continue;
          }
          if (callbacks.onIntercomEvent) {
            try {
              const inter = parseWorldIntercomEventPayload(data);
              this.logTransport("sse:worldState:intercom", {
                status: inter.status,
                requestId: inter.requestId,
                kind: inter.kind,
                channelKey: inter.channelKey,
              });
              callbacks.onIntercomEvent(inter);
            } catch {
              this.logTransport("sse:worldState:intercom", {
                reason: "not_world_intercom_payload",
              });
            }
          }
          const notify = parsePlayerChainFanoutNotifyFromSsePayload(data);
          if (notify === undefined || notify.nodes.length === 0) {
            continue;
          }
          this.logTransport("sse:worldState:playerChainNotify", {
            nodeCount: notify.nodes.length,
            stableKeys: notify.nodes.map((n) => n.stableKey),
          });
          const ordered = sortNodeRefsForSerializedFetch(notify.nodes);
          for (const ref of ordered) {
            const node = await this.getPlayerChainNode(ref.stableKey);
            snapshot = mergeSnapshotWithPlayerChainNode(snapshot, node);
          }
          callbacks.onSnapshot(snapshot);
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logTransport("sse:worldState:error", {
          message: err.message,
        });
        callbacks.onError?.(err);
      }
    })();
    return {
      close: () => {
        this.logTransport("subscribeWorldState:close", {});
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
    const connectionId = randomUUID();
    const leaseTtlSeconds = 45;
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
        connectionId,
        leaseTtlSeconds,
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
    const bodyConnectionId =
      typeof body.connectionId === "string" && body.connectionId.length > 0
        ? body.connectionId
        : connectionId;
    const bodyLeaseTtlSeconds =
      typeof body.leaseTtlSeconds === "number" && Number.isFinite(body.leaseTtlSeconds)
        ? body.leaseTtlSeconds
        : leaseTtlSeconds;
    const existingConnection = this.playerConnectionInfo.get(playerId);
    if (existingConnection !== undefined) {
      clearInterval(existingConnection.timer);
    }
    const timer = setInterval(() => {
      void this.heartbeatPlayerConnection({
        playerId,
        connectionId: bodyConnectionId,
        leaseTtlSeconds: bodyLeaseTtlSeconds,
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[agent-play:RemotePlayWorld] heartbeat:exhausted", {
          playerId,
          connectionId: bodyConnectionId,
          leaseTtlSeconds: bodyLeaseTtlSeconds,
          attempts: PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS,
          retryDelayMs: PLAYER_CONNECTION_HEARTBEAT_RETRY_DELAY_MS,
          error: message,
        });
      });
    }, 12_000);
    this.playerConnectionInfo.set(playerId, {
      connectionId: bodyConnectionId,
      leaseTtlSeconds: bodyLeaseTtlSeconds,
      timer,
    });
    const now = new Date();
    return {
      id: playerId,
      name: input.name,
      sid,
      createdAt: now,
      updatedAt: now,
      previewUrl,
      registeredAgent,
      connectionId: bodyConnectionId,
      leaseTtlSeconds: bodyLeaseTtlSeconds,
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

  async sendIntercomResponse(payload: IntercomResponsePayload): Promise<void> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(sid)}`;
    this.logTransport("intercom:sendResponse:request", {
      url,
      requestId: payload.requestId,
      toPlayerId: payload.toPlayerId,
      fromPlayerId: payload.fromPlayerId,
      kind: payload.kind,
      status: payload.status,
      toolName: payload.toolName,
      error: payload.error,
      resultPreview:
        payload.result !== undefined
          ? this.truncateForLog(JSON.stringify(payload.result))
          : undefined,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({ op: INTERCOM_RESPONSE_OP, payload }),
    });
    const okText = await res.text();
    this.logTransport("intercom:sendResponse:http", {
      requestId: payload.requestId,
      httpStatus: res.status,
      bodyPreview: this.truncateForLog(okText),
    });
    if (!res.ok) {
      throw new Error(`intercomResponse: ${res.status} ${okText}`);
    }
  }

  /**
   * Subscribes to the session SSE stream and handles **`forwarded`** intercom commands whose **`toPlayerId`** is in **`playerId`** or **`playerIds`**, invoking **`executeTool`** and posting **`intercomResponse`** (**`completed`** / **`failed`**).
   * Uses a **single** SSE connection when **`playerIds`** lists multiple automation agents (recommended for several agents in one process).
   * Not invoked automatically by {@link RemotePlayWorld.addAgent}.
   */
  subscribeIntercomCommands(
    options: SubscribeIntercomCommandsOptions
  ): { close: () => void } {
    const subscribed = normalizeIntercomSubscribePlayerIds(options);
    const playerIdsSorted = [...subscribed].sort();
    if (subscribed.size === 0) {
      this.logTransport("subscribeIntercomCommands:skip", {
        reason: "empty_player_ids",
      });
      return { close: () => {} };
    }
    this.logTransport("subscribeIntercomCommands:start", {
      playerIds: playerIdsSorted,
    });
    const { executeTool, chatAgentsByPlayerId } = options;
    let closeSource: (() => void) | null = null;
    const task = (async () => {
      try {
        const { createEventSource } = await import("eventsource-client");
        const sseUrl = `${this.apiBase}/api/agent-play/events?sid=${encodeURIComponent(
          this.getSessionId()
        )}`;
        this.logTransport("subscribeIntercomCommands:sse_open", {
          sseUrl,
          subscribePlayerIds: playerIdsSorted,
        });
        const source = createEventSource({
          url: sseUrl,
          fetch: (input, init) => this.mergeAuthFetch(input, init),
        });
        closeSource = () => {
          source.close();
        };
        for await (const msg of source) {
          const sseEvent = getSseEventName(msg);
          if (
            sseEvent !== undefined &&
            sseEvent !== WORLD_INTERCOM_EVENT
          ) {
            continue;
          }
          if (typeof msg.data !== "string") {
            const eventLabel = sseEvent ?? "(unset)";
            this.logTransport("sse:intercomCommands:skip", {
              reason: "data_not_string",
              sseEvent: eventLabel,
            });
            continue;
          }
          let data: unknown;
          try {
            data = JSON.parse(msg.data) as unknown;
          } catch {
            this.logTransport("sse:intercomCommands:parseJson", {
              reason: "invalid_json",
              sseEvent: sseEvent ?? "(unset)",
            });
            continue;
          }
          let inter: WorldIntercomEventPayload;
          try {
            inter = parseWorldIntercomEventPayload(data);
          } catch {
            continue;
          }
          if (inter.status !== "forwarded") {
            continue;
          }
          const cmd = inter.command;
          if (cmd === undefined) {
            this.logTransport("sse:intercomCommands:skip", {
              reason: "missing_command",
              requestId: inter.requestId,
            });
            continue;
          }
          if (!subscribed.has(cmd.toPlayerId)) {
            continue;
          }
          this.logTransport("sse:intercomCommands:forwarded", {
            requestId: cmd.requestId,
            fromPlayerId: cmd.fromPlayerId,
            toPlayerId: cmd.toPlayerId,
            kind: cmd.kind,
            toolName: cmd.toolName,
          });
          const toolName =
            cmd.kind === "chat" ? "chat_tool" : cmd.toolName ?? "";
          const args =
            cmd.kind === "chat" ? { text: cmd.text ?? "" } : (cmd.args ?? {});
          this.logTransport("intercom:executeTool", {
            requestId: cmd.requestId,
            toolName,
            argsPreview: this.truncateForLog(JSON.stringify(args)),
          });
          try {
            this.logTransport("intercom:executeTool:started", {
              requestId: cmd.requestId,
              toolName,
              argsPreview: this.truncateForLog(JSON.stringify(args)),
            });
            let result: Record<string, unknown>;
            if (
              cmd.kind === "chat" &&
              chatAgentsByPlayerId !== undefined &&
              chatAgentsByPlayerId.has(cmd.toPlayerId)
            ) {
              const lc = chatAgentsByPlayerId.get(cmd.toPlayerId);
              if (lc === undefined) {
                throw new Error("intercom: chatAgentsByPlayerId entry missing");
              }
              this.logTransport("intercom:langchain:invoke", {
                requestId: cmd.requestId,
                toPlayerId: cmd.toPlayerId,
                textPreview: this.truncateForLog(cmd.text ?? ""),
              });
              const rawOut = await invokeLangChainChatAgent(lc, {
                messages: [new HumanMessage(cmd.text ?? "")],
              });
              result = intercomResultRecordFromLangChainInvokeOutput(rawOut);
              this.logTransport("intercom:langchain:invoke:completed", {
                requestId: cmd.requestId,
                resultPreview: this.truncateForLog(JSON.stringify(result)),
              });
            } else {
              result = await Promise.resolve(
                executeTool({ toolName, args })
              );
            }
            this.logTransport("intercom:executeTool:completed", {
              requestId: cmd.requestId,
              toolName,
              argsPreview: this.truncateForLog(JSON.stringify(args)),
              resultPreview: this.truncateForLog(JSON.stringify(result)),
            });
            await this.sendIntercomResponse({
              requestId: cmd.requestId,
              mainNodeId: cmd.mainNodeId,
              toPlayerId: cmd.fromPlayerId,
              fromPlayerId: cmd.toPlayerId,
              kind: cmd.kind,
              status: "completed",
              toolName: cmd.toolName,
              ts: new Date().toISOString(),
              result,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logTransport("intercom:executeTool:error", {
              requestId: cmd.requestId,
              message,
            });
            await this.sendIntercomResponse({
              requestId: cmd.requestId,
              mainNodeId: cmd.mainNodeId,
              toPlayerId: cmd.fromPlayerId,
              fromPlayerId: cmd.toPlayerId,
              kind: cmd.kind,
              status: "failed",
              toolName: cmd.toolName,
              error: message,
              ts: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logTransport("sse:intercomCommands:stream_error", { message });
      }
    })();
    return {
      close: () => {
        this.logTransport("subscribeIntercomCommands:close", {
          playerIds: playerIdsSorted,
        });
        closeSource?.();
        void task;
      },
    };
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

  private async heartbeatPlayerConnection(input: {
    playerId: string;
    connectionId: string;
    leaseTtlSeconds: number;
  }): Promise<void> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/players/heartbeat?sid=${encodeURIComponent(sid)}`;
    const bodyJson = JSON.stringify({
      playerId: input.playerId,
      connectionId: input.connectionId,
      leaseTtlSeconds: input.leaseTtlSeconds,
    });
    let lastError: Error = new Error("heartbeat: no attempts completed");

    for (let attempt = 1; attempt <= PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS; attempt += 1) {
      const attemptStartedAt = Date.now();
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: this.jsonHeaders(),
          body: bodyJson,
        });
        const text = await res.text();
        if (res.ok) {
          if (attempt > 1) {
            console.info("[agent-play:RemotePlayWorld] heartbeat:retry_recovered", {
              playerId: input.playerId,
              connectionId: input.connectionId,
              leaseTtlSeconds: input.leaseTtlSeconds,
              sid,
              url,
              successfulAttempt: attempt,
              attemptsUsed: attempt,
              maxAttempts: PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS,
              durationMs: Date.now() - attemptStartedAt,
            });
          }
          return;
        }
        lastError = new Error(`heartbeat: ${res.status} ${text}`);
      } catch (err: unknown) {
        lastError =
          err instanceof Error ? err : new Error(String(err));
      }

      const willRetry = attempt < PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS;
      console.warn("[agent-play:RemotePlayWorld] heartbeat:attempt_failed", {
        phase: "player_connection_lease_refresh",
        playerId: input.playerId,
        connectionId: input.connectionId,
        leaseTtlSeconds: input.leaseTtlSeconds,
        sid,
        url,
        attempt,
        maxAttempts: PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS,
        remainingAttemptsAfterThisFailure:
          PLAYER_CONNECTION_HEARTBEAT_MAX_ATTEMPTS - attempt,
        errorMessage: lastError.message,
        requestBodyBytes: bodyJson.length,
        attemptDurationMs: Date.now() - attemptStartedAt,
        nextAction: willRetry
          ? `sleep ${PLAYER_CONNECTION_HEARTBEAT_RETRY_DELAY_MS}ms then retry`
          : "no more retries; will throw",
        retryDelayMs: willRetry
          ? PLAYER_CONNECTION_HEARTBEAT_RETRY_DELAY_MS
          : 0,
      });

      if (!willRetry) {
        throw lastError;
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, PLAYER_CONNECTION_HEARTBEAT_RETRY_DELAY_MS);
      });
    }
  }

  private async disconnectPlayerConnection(input: {
    playerId: string;
    connectionId: string;
  }): Promise<void> {
    const sid = this.getSessionId();
    const url = `${this.apiBase}/api/agent-play/players/disconnect?sid=${encodeURIComponent(sid)}`;
    await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        playerId: input.playerId,
        connectionId: input.connectionId,
      }),
    });
  }
}
