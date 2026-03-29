export type WorldInteractionRole = "user" | "assistant" | "tool";

export type RecordInteractionInput = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
};

export type AssistToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
  assistTools?: AssistToolSpec[];
};

export type PlayAgentInformation = {
  id: string;
  name: string;
  sid: string;
  createdAt: Date;
  updatedAt: Date;
};

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
  agent: LangChainAgentRegistration;
  agentId?: string;
};

export type ZoneEventInfo = {
  zoneCount: number;
  flagged?: boolean;
  at: string;
};

export type YieldEventInfo = {
  yieldCount: number;
  at: string;
};

export type WorldStructureKind = "home" | "tool" | "api" | "database" | "model";

export type WorldStructure = {
  id: string;
  kind: WorldStructureKind;
  x: number;
  y: number;
  toolName?: string;
  label?: string;
};

export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  structures: WorldStructure[];
};

export type OriginJourneyStep = {
  type: "origin";
  content: string;
  messageId: string;
};

export type StructureJourneyStep = {
  type: "structure";
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: string;
};

export type DestinationJourneyStep = {
  type: "destination";
  content: string;
  messageId: string;
};

export type JourneyStep =
  | OriginJourneyStep
  | StructureJourneyStep
  | DestinationJourneyStep;

export type Journey = {
  steps: JourneyStep[];
  startedAt: Date;
  completedAt: Date;
};

export type PositionedStep = JourneyStep & {
  x?: number;
  y?: number;
  structureId?: string;
};

export type WorldJourneyUpdate = {
  playerId: string;
  journey: Journey;
  path: PositionedStep[];
  structures: WorldStructure[];
};
