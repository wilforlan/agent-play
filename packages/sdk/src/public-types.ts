export type WorldInteractionRole = "user" | "assistant" | "tool";

export type RecordInteractionInput = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
};

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
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

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
  apiKey?: string;
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
