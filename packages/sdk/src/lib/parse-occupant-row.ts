import type {
  AgentPlayWorldMapHumanOccupant,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapMcpOccupant,
} from "../public-types.js";

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
