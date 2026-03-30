import type {
  Journey,
  WorldJourneyUpdate,
} from "./@types/world.js";
import type { PreviewWorldMapJson } from "./world-map.js";
import type { WorldInteractionRole } from "./play-transport.js";

export type JourneyJson = {
  steps: Journey["steps"];
  startedAt: string;
  completedAt: string;
};

export type WorldJourneyUpdateJson = Omit<WorldJourneyUpdate, "journey"> & {
  journey: JourneyJson;
};

export type PreviewInteractionEntryJson = {
  role: WorldInteractionRole;
  text: string;
  at: string;
  seq: number;
};

export type AssistToolSnapshotJson = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type PreviewPlayerSnapshotJson = {
  playerId: string;
  name: string;
  type?: string;
  toolNames?: string[];
  stationary?: boolean;
  assistToolNames?: string[];
  assistTools?: AssistToolSnapshotJson[];
  hasChatTool?: boolean;
  zoneCount?: number;
  yieldCount?: number;
  flagged?: boolean;
  onZone?: { zoneCount: number; flagged?: boolean; at: string };
  onYield?: { yieldCount: number; at: string };
  structures: WorldJourneyUpdate["structures"];
  lastUpdate?: WorldJourneyUpdateJson;
  recentInteractions?: PreviewInteractionEntryJson[];
};

export type PreviewMcpRegistrationJson = {
  id: string;
  name: string;
  url?: string;
};

export type PreviewSnapshotJson = {
  sid: string;
  players: PreviewPlayerSnapshotJson[];
  worldMap: PreviewWorldMapJson;
  mcpServers?: PreviewMcpRegistrationJson[];
};

export function serializeJourney(journey: Journey): JourneyJson {
  return {
    steps: journey.steps,
    startedAt: journey.startedAt.toISOString(),
    completedAt: journey.completedAt.toISOString(),
  };
}

export function serializeWorldJourneyUpdate(
  update: WorldJourneyUpdate
): WorldJourneyUpdateJson {
  return {
    playerId: update.playerId,
    journey: serializeJourney(update.journey),
    path: update.path,
    structures: update.structures,
  };
}

export function parseJourneyJson(json: JourneyJson): Journey {
  return {
    steps: json.steps,
    startedAt: new Date(json.startedAt),
    completedAt: new Date(json.completedAt),
  };
}

export function parseWorldJourneyUpdateJson(
  json: WorldJourneyUpdateJson
): WorldJourneyUpdate {
  return {
    playerId: json.playerId,
    journey: parseJourneyJson(json.journey),
    path: json.path,
    structures: json.structures,
  };
}
