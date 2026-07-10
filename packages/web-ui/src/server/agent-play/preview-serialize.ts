/**
 * @packageDocumentation
 * @module @agent-play/web-ui/server/preview-serialize
 *
 * Serialises the in-memory play-world into the JSON snapshot consumed by the
 * play-ui client. In 3.1.1 extends {@link SpaceCatalogEntryJson} with an
 * `amenityContent` block carrying shop / supermarket / car-wash items so
 * sold-state changes fan out without separate fetches. Older snapshots are
 * normalised by {@link normalizePreviewSnapshot} to maintain compatibility.
 *
 * @see ../../../sdk/src/lib/space-content-model.ts for the underlying schemas.
 */

import type { Journey, WorldJourneyUpdate } from "./@types/world.js";
import type { WorldInteractionRole } from "./play-transport.js";
import type { SpaceAmenityKind } from "./space-amenity.js";
import { buildWorldMapFromOccupants as computeWorldMapBounds } from "./world-map.js";
import { materializeAgentOccupantCoordinatesForLayout } from "./agent-occupant-positions.js";
import {
  MINIMUM_STREET_LAYOUT_BOUNDS,
  STREET_NAME_POOL,
  createVerticalStripSeedLayout,
  type CarWashCar,
  type ShopItem,
  type SupermarketItem,
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
  streetId?: string;
  x?: number;
  y?: number;
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
  gameId?: string;
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

/**
 * Per-space amenity content fanned out to clients via the snapshot.
 *
 * @remarks
 * Populated by the server when a space has the matching amenity. Older
 * snapshots without this field are normalized via {@link normalizePreviewSnapshot}.
 *
 * @see ../../../sdk/src/lib/space-content-model.ts for the underlying schemas.
 */
export type SpaceAmenityContentJson = {
  shopItems?: ShopItem[];
  supermarketItems?: SupermarketItem[];
  carWashCars?: CarWashCar[];
};

export type SpaceCatalogEntryJson = {
  id: string;
  name: string;
  description: string;
  designKey: string;
  owner: SpaceOwnerJson;
  amenities: SpaceAmenityKind[];
  activityObjectIds?: string[];
  amenityContent?: SpaceAmenityContentJson;
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
  primaryGroup: "agent" | "space" | "arcade";
  allowedGroups: readonly ("agent" | "space" | "arcade")[];
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
        bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
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

const LEGACY_MCP_PRIMARY_GROUP = "mcp";

type WorldLayoutZoneJsonWire = {
  id: string;
  streetId: string;
  streetLabel: string;
  rect: { minX: number; minY: number; maxX: number; maxY: number };
  primaryGroup: string;
  allowedGroups: readonly string[];
};

function normalizeWorldLayoutZoneGroup(
  value: string
): WorldLayoutZoneJson["primaryGroup"] {
  if (value === LEGACY_MCP_PRIMARY_GROUP) {
    return "arcade";
  }
  if (value === "agent" || value === "space" || value === "arcade") {
    return value;
  }
  throw new Error(
    `normalizeWorldLayoutJson: unknown primaryGroup ${value}`
  );
}

function migrateWorldLayoutZone(zone: WorldLayoutZoneJson): WorldLayoutZoneJson {
  const wire = zone as WorldLayoutZoneJson & WorldLayoutZoneJsonWire;
  const primaryGroup = normalizeWorldLayoutZoneGroup(String(wire.primaryGroup));
  const id =
    wire.id === "zone-mcp-strip" ||
    String(wire.primaryGroup) === LEGACY_MCP_PRIMARY_GROUP
      ? "zone-arcade-strip"
      : wire.id;
  const allowedGroups = [
    ...new Set(
      wire.allowedGroups.map((group) =>
        normalizeWorldLayoutZoneGroup(String(group))
      )
    ),
  ];
  return {
    ...zone,
    id,
    primaryGroup,
    allowedGroups,
  };
}

function ensureArcadeZoneInWorldLayout(layout: WorldLayoutJson): WorldLayoutJson {
  const migratedZones = layout.zones.map(migrateWorldLayoutZone);
  if (migratedZones.some((zone) => zone.primaryGroup === "arcade")) {
    return { ...layout, zones: migratedZones };
  }
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("ensureArcadeZoneInWorldLayout: STREET_NAME_POOL too small");
  }
  const streets: readonly [
    { id: string; label: string },
    { id: string; label: string },
    { id: string; label: string },
  ] =
    layout.streets.length >= 3
      ? (() => {
          const s0Street = layout.streets[0];
          const s1Street = layout.streets[1];
          const s2Street = layout.streets[2];
          if (
            s0Street === undefined ||
            s1Street === undefined ||
            s2Street === undefined
          ) {
            throw new Error(
              "ensureArcadeZoneInWorldLayout: expected three streets"
            );
          }
          return [
            { id: s0Street.id, label: s0Street.label },
            { id: s1Street.id, label: s1Street.label },
            { id: s2Street.id, label: s2Street.label },
          ];
        })()
      : [s0, s1, s2];
  const rebuilt = createVerticalStripSeedLayout({
    bounds: layout.bounds,
    streets,
  });
  return {
    ...buildSnapshotWorldLayout(rebuilt),
    rev: layout.rev,
  };
}

export function normalizeWorldLayoutJson(layout: WorldLayoutJson): WorldLayoutJson {
  return ensureArcadeZoneInWorldLayout(layout);
}

export function normalizePreviewSnapshot(
  snapshot: PreviewSnapshotJson | Omit<PreviewSnapshotJson, "worldLayout"> & {
    worldLayout?: WorldLayoutJson;
  }
): PreviewSnapshotJson {
  const rawLayout = snapshot.worldLayout ?? getDefaultPreviewWorldLayoutJson();
  const worldLayout = normalizeWorldLayoutJson(rawLayout);
  return {
    ...snapshot,
    spaces: snapshot.spaces ?? [],
    worldLayout,
  };
}

export function snapshotWorldMapWithResolvedAgents(
  worldMap: PreviewWorldMapJson,
  worldLayout: WorldLayoutJson
): PreviewWorldMapJson {
  const materializedOccupants = materializeAgentOccupantCoordinatesForLayout(
    worldMap.occupants,
    worldLayout
  );
  return buildSnapshotWorldMap(materializedOccupants);
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
  const positions: Array<{ x: number; y: number }> = [];
  for (const o of occupants) {
    const x = o.x;
    const y = o.y;
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error(
        "buildSnapshotWorldMap: every occupant must have numeric x and y (run materialize first)"
      );
    }
    positions.push({ x, y });
  }
  const { bounds } = computeWorldMapBounds(positions);
  return { bounds, occupants };
}
