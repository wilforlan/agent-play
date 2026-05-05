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
};

export type SpaceNode = {
  id: string;
  name: string;
  designKey: string;
  activityObjectIds: string[];
};

export type StructureNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  worldId: string;
  spaceIds: string[];
};

export type WorldPlayerLocation = {
  playerId: string;
  worldId: string;
  structureId?: string;
  spaceId?: string;
};

export type WorldSpaceTransition = {
  playerId: string;
  from: WorldPlayerLocation;
  to: WorldPlayerLocation;
  at: string;
};
