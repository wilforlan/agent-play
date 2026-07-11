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

function agentNeedsCoordinatePlacement(input: {
  agent: PreviewWorldMapAgentOccupantJson;
  zone: Zone;
  claimedKeys: ReadonlySet<string>;
}): boolean {
  const coordX = input.agent.x;
  const coordY = input.agent.y;
  if (
    typeof coordX !== "number" ||
    typeof coordY !== "number" ||
    !Number.isFinite(coordX) ||
    !Number.isFinite(coordY) ||
    !pointCellInZone(coordX, coordY, input.zone)
  ) {
    return true;
  }
  const key = occupancyKeyForPosition(coordX, coordY);
  return input.claimedKeys.has(key);
}

export function materializeAgentOccupantCoordinatesForLayout(
  occupants: readonly PreviewWorldMapOccupantJson[],
  worldLayoutJson: WorldLayoutJson
): PreviewWorldMapOccupantJson[] {
  const layout = worldLayoutJsonToRuntime(worldLayoutJson);
  const agentPrimary = pickZoneForGroup(layout, "agent");

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
    if (
      !agentNeedsCoordinatePlacement({
        agent,
        zone,
        claimedKeys: occupiedKeys,
      })
    ) {
      const coordX = agent.x;
      const coordY = agent.y;
      const key = occupancyKeyForPosition(coordX, coordY);
      occupiedKeys.add(key);
      existingOccupants.push({ x: coordX, y: coordY });
      byId.set(agent.agentId, {
        ...agent,
        x: coordX,
        y: coordY,
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
