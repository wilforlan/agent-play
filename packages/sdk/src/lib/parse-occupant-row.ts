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
  let platform: string | undefined;
  if (typeof raw.platform === "string") {
    platform = raw.platform;
  } else if (typeof raw.agentType === "string") {
    platform = raw.agentType;
  }
  if (platform !== undefined) {
    return { ...base, platform };
  }
  return base;
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
