/**
 * Domain types for sessions, journeys, players, and world structures shared by the SDK and server.
 */

/** Role for a single line in the interaction log / chat stream. */
export type WorldInteractionRole = "user" | "assistant" | "tool";

/**
 * Payload for {@link import("./lib/remote-play-world.js").RemotePlayWorld.recordInteraction}.
 *
 * @property playerId - Player id returned from `addPlayer`.
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
 * Serializable shape returned by {@link import("./platforms/langchain.js").langchainRegistration} for `addPlayer`.
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

/** Input fields for `addPlayer` before `agent` is attached. */
export type PlatformAgentInformation = {
  name: string;
  type: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Register a player (agent) in the world.
 *
 * Use **`langchainRegistration(agent)`** for `agent` (requires a **`chat_tool`** tool; `assist_*`
 * tools are indexed for the watch UI).
 *
 * **`apiKey`** is set on **`RemotePlayWorld`** options, not here. With a registered-agent
 * repository, you may pass **`agentId`** from **`agent-play create`**, or omit it: the server
 * matches an existing agent by **`name`** plus **`agent.toolNames`**, or creates a registered
 * agent when under the account limit. Without Redis, omit **`apiKey`** and **`agentId`**.
 */
export type AddPlayerInput = PlatformAgentInformation & {
  /** Registration from {@link import("./platforms/langchain.js").langchainRegistration}. */
  agent: LangChainAgentRegistration;
  /** Optional explicit registered agent id when using Redis repository. */
  agentId?: string;
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

/** Kind of world structure tile (home base, tool pad, API, etc.). */
export type WorldStructureKind = "home" | "tool" | "api" | "database" | "model";

/**
 * One placed structure on the world map for a player.
 *
 * @property id - Stable id (often derived from tool name / layout).
 * @property kind - Visual category.
 * @property x, y - Coordinates in world grid units.
 * @property toolName - When kind is tool-related, the tool name.
 * @property label - Optional human label for the canvas.
 */
export type WorldStructure = {
  id: string;
  kind: WorldStructureKind;
  x: number;
  y: number;
  toolName?: string;
  label?: string;
};

/** Result of `addPlayer` including watch URL and laid-out structures. */
export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  structures: WorldStructure[];
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
 * @property steps - Ordered path from origin through structures to destination.
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

/** Full snapshot row for a journey update (SSE `world:journey`). */
export type WorldJourneyUpdate = {
  playerId: string;
  journey: Journey;
  path: PositionedStep[];
  structures: WorldStructure[];
};
