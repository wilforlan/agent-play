import type { Journey, WorldJourneyUpdate } from "./@types/world.js";
import type { WorldInteractionRole } from "./play-transport.js";
import { buildWorldMapFromOccupants as computeWorldMapBounds } from "./world-map.js";

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

export type PreviewWorldMapAgentOccupantJson = {
  kind: "agent";
  nodeId?: string;
  agentId: string;
  name: string;
  x: number;
  y: number;
  platform?: string;
  toolNames?: string[];
  assistToolNames?: string[];
  assistTools?: AssistToolSnapshotJson[];
  hasChatTool?: boolean;
  enableP2a?: "on" | "off";
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
  stationary?: boolean;
  lastUpdate?: WorldJourneyUpdateJson;
  recentInteractions?: PreviewInteractionEntryJson[];
  zoneCount?: number;
  yieldCount?: number;
  flagged?: boolean;
  onZone?: { zoneCount: number; flagged?: boolean; at: string };
  onYield?: { yieldCount: number; at: string };
};

export type PreviewWorldMapHumanOccupantJson = {
  kind: "human";
  id: string;
  name: string;
  x: number;
  y: number;
  interactive?: boolean;
};

export type PreviewWorldMapMcpOccupantJson = {
  kind: "mcp";
  id: string;
  name: string;
  x: number;
  y: number;
  url?: string;
};

export type PreviewWorldMapOccupantJson =
  | PreviewWorldMapHumanOccupantJson
  | PreviewWorldMapAgentOccupantJson
  | PreviewWorldMapMcpOccupantJson;

export type PreviewWorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  occupants: PreviewWorldMapOccupantJson[];
};

export type PreviewMcpRegistrationJson = {
  id: string;
  name: string;
  url?: string;
};

export type PreviewSnapshotJson = {
  sid: string;
  mainNodeId?: string;
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
  };
}

export function buildSnapshotWorldMap(
  occupants: PreviewWorldMapOccupantJson[]
): PreviewWorldMapJson {
  return computeWorldMapBounds(occupants);
}
