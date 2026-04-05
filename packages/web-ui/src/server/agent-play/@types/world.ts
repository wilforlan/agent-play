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
