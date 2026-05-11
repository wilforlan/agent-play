import type { Journey, WorldJourneyUpdate } from "./@types/world.js";
import type { WorldInteractionRole } from "./play-transport.js";
import type { SpaceAmenityKind } from "./space-amenity.js";
import { buildWorldMapFromOccupants as computeWorldMapBounds } from "./world-map.js";
import {
  MINIMUM_PLAY_WORLD_BOUNDS,
  STREET_NAME_POOL,
  createVerticalStripSeedLayout,
  type WorldLayout,
} from "@agent-play/sdk";

export type { SpaceAmenityKind } from "./space-amenity.js";

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
  realtimeInstructions?: string;
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

export type PreviewWorldMapStructureOccupantJson = {
  kind: "structure";
  id: string;
  name: string;
  x: number;
  y: number;
  worldId: string;
  spaceIds: string[];
  /** Fixed map anchor (space-backed structures use true). */
  stationary?: boolean;
  primaryAmenity?: SpaceAmenityKind;
  amenities?: SpaceAmenityKind[];
};

export type PreviewWorldMapOccupantJson =
  | PreviewWorldMapHumanOccupantJson
  | PreviewWorldMapAgentOccupantJson
  | PreviewWorldMapMcpOccupantJson
  | PreviewWorldMapStructureOccupantJson;

export type SpaceOwnerJson = {
  displayName: string;
  playerId?: string;
  nodeId?: string;
};

export type SpaceCatalogEntryJson = {
  id: string;
  name: string;
  description: string;
  designKey: string;
  owner: SpaceOwnerJson;
  amenities: SpaceAmenityKind[];
  activityObjectIds?: string[];
};

export type PreviewWorldMapJson = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  occupants: PreviewWorldMapOccupantJson[];
};

export type WorldLayoutZoneJson = {
  id: string;
  streetId: string;
  streetLabel: string;
  rect: { minX: number; minY: number; maxX: number; maxY: number };
  primaryGroup: "agent" | "space" | "mcp";
  allowedGroups: readonly ("agent" | "space" | "mcp")[];
};

export type WorldLayoutStreetJson = {
  id: string;
  label: string;
};

export type WorldLayoutJson = {
  rev: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  zones: WorldLayoutZoneJson[];
  streets: WorldLayoutStreetJson[];
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
  worldLayout: WorldLayoutJson;
  spaces?: SpaceCatalogEntryJson[];
  mcpServers?: PreviewMcpRegistrationJson[];
};

let defaultWorldLayoutJsonCache: WorldLayoutJson | null = null;

export function getDefaultPreviewWorldLayoutJson(): WorldLayoutJson {
  if (defaultWorldLayoutJsonCache === null) {
    const s0 = STREET_NAME_POOL[0];
    const s1 = STREET_NAME_POOL[1];
    const s2 = STREET_NAME_POOL[2];
    if (s0 === undefined || s1 === undefined || s2 === undefined) {
      throw new Error("getDefaultPreviewWorldLayoutJson: STREET_NAME_POOL too small");
    }
    defaultWorldLayoutJsonCache = buildSnapshotWorldLayout(
      createVerticalStripSeedLayout({
        bounds: MINIMUM_PLAY_WORLD_BOUNDS,
        streets: [s0, s1, s2],
      })
    );
  }
  return defaultWorldLayoutJsonCache;
}

export function buildSnapshotWorldLayout(layout: WorldLayout): WorldLayoutJson {
  return {
    rev: layout.rev,
    bounds: { ...layout.bounds },
    zones: layout.zones.map((z) => ({
      id: z.id,
      streetId: z.streetId,
      streetLabel: z.streetLabel,
      rect: { ...z.rect },
      primaryGroup: z.primaryGroup,
      allowedGroups: [...z.allowedGroups],
    })),
    streets: layout.streets.map((s) => ({ id: s.id, label: s.label })),
  };
}

export function normalizePreviewSnapshot(
  snapshot: PreviewSnapshotJson | Omit<PreviewSnapshotJson, "worldLayout"> & {
    worldLayout?: WorldLayoutJson;
  }
): PreviewSnapshotJson {
  return {
    ...snapshot,
    spaces: snapshot.spaces ?? [],
    worldLayout: snapshot.worldLayout ?? getDefaultPreviewWorldLayoutJson(),
  };
}

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
