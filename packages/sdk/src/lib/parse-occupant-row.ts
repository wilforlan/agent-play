import type {
  AgentPlaySpaceAmenityKind,
  AgentPlaySpaceCatalogEntry,
  AgentPlayWorldMapHumanOccupant,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapMcpOccupant,
  AgentPlayWorldMapStructureOccupant,
} from "../public-types.js";

const SPACE_AMENITY_KINDS: readonly AgentPlaySpaceAmenityKind[] = [
  "supermarket",
  "shop",
  "car_wash",
];

function isSpaceAmenityKind(v: string): v is AgentPlaySpaceAmenityKind {
  return (SPACE_AMENITY_KINDS as readonly string[]).includes(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseHumanOccupantRow(
  raw: Record<string, unknown>
): AgentPlayWorldMapHumanOccupant {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("occupant: human needs id and name");
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number") {
    throw new Error("occupant: human needs numeric x and y");
  }
  const base: AgentPlayWorldMapHumanOccupant = {
    kind: "human",
    id: raw.id,
    name: raw.name,
    x: raw.x,
    y: raw.y,
  };
  if (typeof raw.interactive === "boolean") {
    return { ...base, interactive: raw.interactive };
  }
  return base;
}

export function parseAgentOccupantRow(
  raw: Record<string, unknown>
): AgentPlayWorldMapAgentOccupant {
  if (typeof raw.agentId !== "string" || typeof raw.name !== "string") {
    throw new Error("occupant: agent needs agentId and name");
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number") {
    throw new Error("occupant: agent needs numeric x and y");
  }
  const base: AgentPlayWorldMapAgentOccupant = {
    kind: "agent",
    agentId: raw.agentId,
    name: raw.name,
    x: raw.x,
    y: raw.y,
  };
  if (typeof raw.nodeId === "string" && raw.nodeId.length > 0) {
    base.nodeId = raw.nodeId;
  }
  let platform: string | undefined;
  if (typeof raw.platform === "string") {
    platform = raw.platform;
  } else if (typeof raw.agentType === "string") {
    platform = raw.agentType;
  }
  const enableP2a =
    raw.enableP2a === "on" || raw.enableP2a === "off" ? raw.enableP2a : undefined;
  const realtimeInstructions =
    typeof raw.realtimeInstructions === "string" &&
    raw.realtimeInstructions.trim().length > 0
      ? raw.realtimeInstructions
      : undefined;
  const realtimeRaw = raw.realtimeWebrtc;
  const realtimeWebrtc =
    typeof realtimeRaw === "object" &&
    realtimeRaw !== null &&
    typeof (realtimeRaw as Record<string, unknown>).clientSecret === "string" &&
    ((realtimeRaw as Record<string, unknown>).clientSecret as string).length > 0 &&
    typeof (realtimeRaw as Record<string, unknown>).model === "string" &&
    ((realtimeRaw as Record<string, unknown>).model as string).length > 0
      ? (() => {
          const record = realtimeRaw as Record<string, unknown>;
          const parsed: {
            clientSecret: string;
            model: string;
            expiresAt?: string;
            voice?: string;
          } = {
            clientSecret: record.clientSecret as string,
            model: record.model as string,
          };
          if (typeof record.expiresAt === "string" && record.expiresAt.length > 0) {
            parsed.expiresAt = record.expiresAt;
          }
          if (typeof record.voice === "string" && record.voice.length > 0) {
            parsed.voice = record.voice;
          }
          return parsed;
        })()
      : undefined;

  const out: AgentPlayWorldMapAgentOccupant = { ...base };
  if (platform !== undefined) {
    out.platform = platform;
  }
  if (enableP2a !== undefined) {
    out.enableP2a = enableP2a;
  }
  if (realtimeInstructions !== undefined) {
    out.realtimeInstructions = realtimeInstructions;
  }
  if (realtimeWebrtc !== undefined) {
    out.realtimeWebrtc = realtimeWebrtc;
  }
  return out;
}

export function parseMcpOccupantRow(
  raw: Record<string, unknown>
): AgentPlayWorldMapMcpOccupant {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("occupant: mcp needs id and name");
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number") {
    throw new Error("occupant: mcp needs numeric x and y");
  }
  const base: AgentPlayWorldMapMcpOccupant = {
    kind: "mcp",
    id: raw.id,
    name: raw.name,
    x: raw.x,
    y: raw.y,
  };
  if (typeof raw.url === "string") {
    return { ...base, url: raw.url };
  }
  return base;
}

export function parseSpaceCatalogEntry(
  raw: Record<string, unknown>
): AgentPlaySpaceCatalogEntry {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("space catalog: id and name required");
  }
  if (typeof raw.description !== "string") {
    throw new Error("space catalog: description required");
  }
  if (typeof raw.designKey !== "string") {
    throw new Error("space catalog: designKey required");
  }
  const ownerRaw = raw.owner;
  if (!isRecord(ownerRaw) || typeof ownerRaw.displayName !== "string") {
    throw new Error("space catalog: owner.displayName required");
  }
  const amenitiesRaw = raw.amenities;
  if (!Array.isArray(amenitiesRaw) || amenitiesRaw.length === 0) {
    throw new Error("space catalog: amenities must be a non-empty array");
  }
  const amenities: AgentPlaySpaceAmenityKind[] = [];
  for (const a of amenitiesRaw) {
    if (typeof a !== "string" || !isSpaceAmenityKind(a)) {
      throw new Error("space catalog: invalid amenity");
    }
    amenities.push(a);
  }
  const owner: AgentPlaySpaceCatalogEntry["owner"] = {
    displayName: ownerRaw.displayName,
  };
  if (typeof ownerRaw.playerId === "string" && ownerRaw.playerId.length > 0) {
    owner.playerId = ownerRaw.playerId;
  }
  if (typeof ownerRaw.nodeId === "string" && ownerRaw.nodeId.length > 0) {
    owner.nodeId = ownerRaw.nodeId;
  }
  const entry: AgentPlaySpaceCatalogEntry = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    designKey: raw.designKey,
    owner,
    amenities,
  };
  if (Array.isArray(raw.activityObjectIds)) {
    const ids: string[] = [];
    for (const x of raw.activityObjectIds) {
      if (typeof x === "string") {
        ids.push(x);
      }
    }
    if (ids.length > 0) {
      entry.activityObjectIds = ids;
    }
  }
  return entry;
}

export function parseStructureOccupantRow(
  raw: Record<string, unknown>
): AgentPlayWorldMapStructureOccupant {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("occupant: structure needs id and name");
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number") {
    throw new Error("occupant: structure needs numeric x and y");
  }
  if (typeof raw.worldId !== "string") {
    throw new Error("occupant: structure needs worldId");
  }
  const spaceIdsRaw = raw.spaceIds;
  if (!Array.isArray(spaceIdsRaw) || spaceIdsRaw.length === 0) {
    throw new Error("occupant: structure needs non-empty spaceIds");
  }
  const spaceIds: string[] = [];
  for (const s of spaceIdsRaw) {
    if (typeof s !== "string") {
      throw new Error("occupant: structure spaceIds must be strings");
    }
    spaceIds.push(s);
  }
  const base: AgentPlayWorldMapStructureOccupant = {
    kind: "structure",
    id: raw.id,
    name: raw.name,
    x: raw.x,
    y: raw.y,
    worldId: raw.worldId,
    spaceIds,
  };
  const pa = raw.primaryAmenity;
  if (typeof pa === "string" && isSpaceAmenityKind(pa)) {
    base.primaryAmenity = pa;
  }
  const am = raw.amenities;
  if (Array.isArray(am) && am.length > 0) {
    const list: AgentPlaySpaceAmenityKind[] = [];
    for (const x of am) {
      if (typeof x === "string" && isSpaceAmenityKind(x)) {
        list.push(x);
      }
    }
    if (list.length > 0) {
      base.amenities = list;
    }
  }
  return base;
}
