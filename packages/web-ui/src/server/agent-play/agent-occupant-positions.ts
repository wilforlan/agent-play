import {
  occupancyKeyForPosition,
  pickZoneForGroup,
  pointCellInZone,
  type WorldLayout,
  type Zone,
} from "@agent-play/sdk";
import { computeRandomFreeMapCellInZone } from "./grid-allocate.js";
import type {
  PreviewWorldMapAgentOccupantJson,
  PreviewWorldMapOccupantJson,
  WorldLayoutJson,
} from "./preview-serialize.js";

function worldLayoutJsonToRuntime(json: WorldLayoutJson): WorldLayout {
  return {
    rev: json.rev,
    bounds: { ...json.bounds },
    zones: json.zones.map((z) => ({
      id: z.id,
      streetId: z.streetId,
      streetLabel: z.streetLabel,
      primaryGroup: z.primaryGroup,
      allowedGroups: [...z.allowedGroups],
      rect: { ...z.rect },
    })),
    streets: json.streets.map((s) => ({ id: s.id, label: s.label })),
  };
}

function zoneForAgentStreet(
  layout: WorldLayout,
  streetId: string | undefined,
  agentPrimary: Zone
): Zone {
  if (streetId !== undefined && streetId.trim().length > 0) {
    const match = layout.zones.find(
      (z) => z.streetId === streetId && z.primaryGroup === "agent"
    );
    if (match !== undefined) {
      return match;
    }
  }
  return agentPrimary;
}

export function materializeAgentOccupantCoordinatesForLayout(
  occupants: readonly PreviewWorldMapOccupantJson[],
  worldLayoutJson: WorldLayoutJson
): PreviewWorldMapOccupantJson[] {
  const layout = worldLayoutJsonToRuntime(worldLayoutJson);
  const agentPrimary = pickZoneForGroup(layout, "agent");
  const anyAgentNeedsPlacement = occupants.some((o) => {
    if (o.kind !== "agent") {
      return false;
    }
    const zone = zoneForAgentStreet(layout, o.streetId, agentPrimary);
    return (
      typeof o.x !== "number" ||
      typeof o.y !== "number" ||
      !Number.isFinite(o.x) ||
      !Number.isFinite(o.y) ||
      !pointCellInZone(o.x, o.y, zone)
    );
  });
  if (!anyAgentNeedsPlacement) {
    return occupants.map((o) => (o.kind === "agent" ? { ...o } : o));
  }

  const fixedPositions: Array<{ x: number; y: number }> = [];
  for (const o of occupants) {
    if (o.kind === "agent") {
      continue;
    }
    fixedPositions.push({ x: o.x, y: o.y });
  }
  const occupiedKeys = new Set(
    fixedPositions.map((p) => occupancyKeyForPosition(p.x, p.y))
  );
  const existingOccupants = [...fixedPositions];

  const agents = occupants
    .filter((o): o is PreviewWorldMapAgentOccupantJson => o.kind === "agent")
    .slice()
    .sort((a, b) => a.agentId.localeCompare(b.agentId));

  const byId = new Map<string, PreviewWorldMapAgentOccupantJson>();
  for (const agent of agents) {
    const zone = zoneForAgentStreet(layout, agent.streetId, agentPrimary);
    const hasValidCoords =
      typeof agent.x === "number" &&
      typeof agent.y === "number" &&
      Number.isFinite(agent.x) &&
      Number.isFinite(agent.y) &&
      pointCellInZone(agent.x, agent.y, zone);
    if (hasValidCoords) {
      const key = occupancyKeyForPosition(agent.x, agent.y);
      occupiedKeys.add(key);
      existingOccupants.push({ x: agent.x, y: agent.y });
      byId.set(agent.agentId, {
        ...agent,
        x: agent.x,
        y: agent.y,
        streetId: agent.streetId ?? zone.streetId,
      });
      continue;
    }
    const pos = computeRandomFreeMapCellInZone(occupiedKeys, zone, "agentSpawn", {
      existingOccupants,
      occupantInfo: {
        id: agent.agentId,
        kind: "agent",
        name: agent.name,
      },
    });
    occupiedKeys.add(occupancyKeyForPosition(pos.x, pos.y));
    existingOccupants.push({ x: pos.x, y: pos.y });
    byId.set(agent.agentId, {
      ...agent,
      x: pos.x,
      y: pos.y,
      streetId: agent.streetId ?? zone.streetId,
    });
  }

  return occupants.map((o) => {
    if (o.kind !== "agent") {
      return o;
    }
    return byId.get(o.agentId) ?? o;
  });
}
