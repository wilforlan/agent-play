/**
 * Domain types for sessions, journeys, agents, and the shared world map exposed by the SDK and server.
 */

/** Role for a single line in the interaction log / chat stream. */
export type WorldInteractionRole = "user" | "assistant" | "tool";

/**
 * Payload for {@link import("./lib/remote-play-world.js").RemotePlayWorld.recordInteraction}.
 *
 * @property playerId - Player id returned from `addAgent` / `addPlayer`.
 * @property role - Who "spoke" the line.
 * @property text - Plain text; may be truncated for display server-side.
 */
export type RecordInteractionInput = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
};

/**
 * Metadata for a tool whose name starts with `assist_`, shown as assist actions on the watch UI.
 *
 * @property parameters - Derived from Zod object `schema` when present; placeholder hints otherwise.
 */
export type AssistToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/**
 * Serializable shape returned by {@link import("./platforms/langchain.js").langchainRegistration} for agent registration.
 *
 * @property type - Always `"langchain"` for this adapter.
 * @property toolNames - All tool names from the agent (must include `chat_tool`).
 * @property assistTools - Subset of tools with `assist_` prefix, for UI buttons.
 */
export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
  assistTools?: AssistToolSpec[];
};

/** Minimal player identity in the SDK (without preview URL). */
export type PlayAgentInformation = {
  id: string;
  name: string;
  sid: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Input fields for {@link AddAgentInput} / {@link AddPlayerInput} before `agent` is attached. */
export type PlatformAgentInformation = {
  name: string;
  type: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Register an automation agent in the world, tied to **agent node identity**.
 *
 * Use **`langchainRegistration(agent)`** for `agent` (requires a **`chat_tool`** tool; `assist_*`
 * tools are indexed for the watch UI).
 *
 * **`nodeId`** is the **agent node id** (from **`agent-play create`** when the server uses a repository).
 * It is sent on the wire as `agentId` for server compatibility; treating it as a node id makes the
 * contract explicit for billing, validation, and event attribution.
 */
export type AddAgentInput = PlatformAgentInformation & {
  /** Registration from {@link import("./platforms/langchain.js").langchainRegistration}. */
  agent: LangChainAgentRegistration;
  /** Main node id that owns the agent (required on repository-backed servers). */
  mainNodeId?: string;
  /** Agent node id — same value the server stores as registered `agentId`. */
  nodeId: string;
};

/**
 * Register a player (agent) in the world.
 *
 * @deprecated Prefer {@link AddAgentInput} and `RemotePlayWorld.prototype.addAgent` for SDK and automation; use `nodeId` there instead of `agentId`.
 *
 * Use **`langchainRegistration(agent)`** for `agent` (requires a **`chat_tool`** tool; `assist_*`
 * tools are indexed for the watch UI).
 *
 * **`agentId`** is required: use an id from **`agent-play create`** when the server uses a repository
 * (with account **`password`** from **`RemotePlayWorld`**), or any stable string for local dev without Redis.
 */
export type AddPlayerInput = PlatformAgentInformation & {
  /** Registration from {@link import("./platforms/langchain.js").langchainRegistration}. */
  agent: LangChainAgentRegistration;
  /** Main node id that owns the agent (required on repository-backed servers). */
  mainNodeId?: string;
  /** Registered agent id (or session-local id without Redis). */
  agentId: string;
};

/** Zone counter event surfaced on snapshots and signals. */
export type ZoneEventInfo = {
  zoneCount: number;
  flagged?: boolean;
  at: string;
};

/** Yield counter event surfaced on snapshots and signals. */
export type YieldEventInfo = {
  yieldCount: number;
  at: string;
};

/** Repository-backed summary returned with `addAgent` when the agent is (or maps to) a stored registration. */
export type RegisteredAgentSummary = {
  agentId: string;
  name: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
};

/** Result of `addAgent` / `addPlayer` including watch URL and registered-agent metadata from the server. */
export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  registeredAgent: RegisteredAgentSummary;
  connectionId?: string;
  leaseTtlSeconds?: number;
};

/** First step of a journey: user message origin. */
export type OriginJourneyStep = {
  type: "origin";
  content: string;
  messageId: string;
};

/** Middle step: tool invocation on the map. */
export type StructureJourneyStep = {
  type: "structure";
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: string;
};

/** Final step: assistant reply. */
export type DestinationJourneyStep = {
  type: "destination";
  content: string;
  messageId: string;
};

/** Union of journey step shapes. */
export type JourneyStep =
  | OriginJourneyStep
  | StructureJourneyStep
  | DestinationJourneyStep;

/**
 * Ordered journey with timestamps; sent to the server via `recordJourney`.
 *
 * @property steps - Ordered path from origin through tool steps to destination.
 * @property startedAt, completedAt - Wall times for the run (client or server).
 */
export type Journey = {
  steps: JourneyStep[];
  startedAt: Date;
  completedAt: Date;
};

/** Journey step after server assigns coordinates (and optional structure id). */
export type PositionedStep = JourneyStep & {
  x?: number;
  y?: number;
  structureId?: string;
};

export type AgentPlayWorldMapBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * One agent on the world map. Coordinates are grid positions; the server enforces unique `(x,y)` per occupant.
 */
export type AgentPlayWorldMapAgentOccupant = {
  kind: "agent";
  nodeId?: string;
  agentId: string;
  name: string;
  x: number;
  y: number;
  /**
   * Integration label from addPlayer `type` (e.g. `langchain`). Populated from the snapshot field `platform`. The legacy wire field `agentType` is deprecated and accepted only for backward compatibility when parsing JSON.
   */
  platform?: string;
  toolNames?: string[];
  assistToolNames?: string[];
  assistTools?: AssistToolSpec[];
  hasChatTool?: boolean;
  stationary?: boolean;
  lastUpdate?: unknown;
  recentInteractions?: Array<{
    role: WorldInteractionRole;
    text: string;
    at: string;
    seq: number;
  }>;
  zoneCount?: number;
  yieldCount?: number;
  flagged?: boolean;
  onZone?: ZoneEventInfo;
  onYield?: YieldEventInfo;
};

/** MCP server shown as a separate map occupant (distinct from LangChain agents). */
export type AgentPlayWorldMapHumanOccupant = {
  kind: "human";
  id: string;
  name: string;
  x: number;
  y: number;
  interactive?: boolean;
};

/** MCP server shown as a separate map occupant (distinct from LangChain agents). */
export type AgentPlayWorldMapMcpOccupant = {
  kind: "mcp";
  id: string;
  name: string;
  x: number;
  y: number;
  url?: string;
};

/** Spatial index: axis-aligned bounds plus every agent and MCP registration placed on the grid. */
export type AgentPlayWorldMap = {
  bounds: AgentPlayWorldMapBounds;
  occupants: (
    | AgentPlayWorldMapHumanOccupant
    | AgentPlayWorldMapAgentOccupant
    | AgentPlayWorldMapMcpOccupant
  )[];
};

/**
 * Session snapshot from {@link import("./lib/remote-play-world.js").RemotePlayWorld.getWorldSnapshot}.
 * Agents and MCP servers appear only under **`worldMap.occupants`** (no separate `players` list).
 */
export type AgentPlaySnapshot = {
  sid: string;
  worldMap: AgentPlayWorldMap;
  mcpServers?: Array<{ id: string; name: string; url?: string }>;
};

export type PlayerChainNotifyNodeRef = {
  stableKey: string;
  leafIndex: number;
  removed?: boolean;
  updatedAt?: string;
};

export type PlayerChainFanoutNotify = {
  updatedAt: string;
  nodes: PlayerChainNotifyNodeRef[];
};

export type PlayerChainGenesisStableKey = "__genesis__";
export type PlayerChainHeaderStableKey = "__header__";

export type PlayerChainGenesisNode = {
  kind: "genesis";
  stableKey: PlayerChainGenesisStableKey;
  text: string;
};

export type PlayerChainHeaderNode = {
  kind: "header";
  stableKey: PlayerChainHeaderStableKey;
  sid: string;
  bounds: AgentPlayWorldMapBounds;
};

export type PlayerChainOccupantRemovedNode = {
  kind: "occupant";
  stableKey: string;
  removed: true;
};

export type PlayerChainOccupantPresentNode = {
  kind: "occupant";
  stableKey: string;
  removed: false;
  occupant:
    | AgentPlayWorldMapHumanOccupant
    | AgentPlayWorldMapAgentOccupant
    | AgentPlayWorldMapMcpOccupant;
};

export type PlayerChainNodeResponse =
  | PlayerChainGenesisNode
  | PlayerChainHeaderNode
  | PlayerChainOccupantRemovedNode
  | PlayerChainOccupantPresentNode;

/** Full journey + path update (SSE `world:journey`); coordinates are embedded in `path` steps. */
export type WorldJourneyUpdate = {
  playerId: string;
  journey: Journey;
  path: PositionedStep[];
};
