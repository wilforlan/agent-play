/**
 * @module @agent-play/play-ui/proximity-interaction
 * proximity interaction — preview canvas module (Pixi + DOM).
 */
import type { GameId } from "@agent-play/sdk/browser";

export const DEFAULT_PROXIMITY_RADIUS = 0.72;

export function findNearestProximityPartner(options: {
  primaryId: string;
  positions: ReadonlyMap<string, { x: number; y: number }>;
  radius: number;
  allowedPartnerIds?: ReadonlySet<string>;
}): string | null {
  const self = options.positions.get(options.primaryId);
  if (self === undefined) return null;
  const allow = options.allowedPartnerIds;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const [id, pos] of options.positions) {
    if (id === options.primaryId) continue;
    if (allow !== undefined && !allow.has(id)) continue;
    const d = Math.hypot(pos.x - self.x, pos.y - self.y);
    if (d <= options.radius && d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

export type ProximityActionKind =
  | "assist"
  | "chat"
  | "push_to_talk"
  | "zone"
  | "yield";

export function proximityKeyToAction(key: string): ProximityActionKind | null {
  const k = key.toLowerCase();
  if (k === "a") return "assist";
  if (k === "c") return "chat";
  if (k === "p") return "push_to_talk";
  if (k === "z") return "zone";
  if (k === "y") return "yield";
  return null;
}

export const DEFAULT_STRUCTURE_PROXIMITY_RADIUS = 2.4;

export type StructureProximityInput = {
  id: string;
  x: number;
  y: number;
  spaceIds?: readonly string[];
  gameId?: GameId;
  primaryAmenity?: string;
  label?: string;
  name?: string;
};

export type StructureProximityTarget = {
  structureId: string;
  spaceId?: string;
  gameId?: GameId;
  centroid: { x: number; y: number };
  primaryAmenity?: string;
  label?: string;
};

export function findNearestStructureProximityTarget(options: {
  player: { x: number; y: number };
  structures: ReadonlyArray<StructureProximityInput>;
  radius: number;
}): StructureProximityTarget | null {
  let bestTarget: StructureProximityTarget | null = null;
  let bestDist = Infinity;

  const consider = (target: StructureProximityTarget, dist: number): void => {
    if (dist > options.radius) return;
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = target;
    }
  };

  for (const st of options.structures) {
    if (st.gameId !== undefined) {
      const dist = Math.hypot(st.x - options.player.x, st.y - options.player.y);
      const label = st.label ?? st.name;
      consider(
        {
          structureId: st.id,
          gameId: st.gameId,
          centroid: { x: st.x, y: st.y },
          ...(label !== undefined ? { label } : {}),
        },
        dist
      );
    }
  }

  const eligible = options.structures.filter(
    (st) => Array.isArray(st.spaceIds) && st.spaceIds.length > 0
  );
  const compounds = new Map<string, StructureProximityInput[]>();
  for (const st of eligible) {
    const spaceId = st.spaceIds?.[0];
    if (spaceId === undefined) continue;
    const arr = compounds.get(spaceId) ?? [];
    arr.push(st);
    compounds.set(spaceId, arr);
  }
  for (const [spaceId, group] of compounds) {
    const cx = group.reduce((s, st) => s + st.x, 0) / group.length;
    const cy = group.reduce((s, st) => s + st.y, 0) / group.length;
    const dist = Math.hypot(cx - options.player.x, cy - options.player.y);
    const anchor = group[0];
    if (anchor === undefined) continue;
    const label = anchor.label ?? anchor.name;
    consider(
      {
        structureId: anchor.id,
        spaceId,
        centroid: { x: cx, y: cy },
        ...(anchor.primaryAmenity !== undefined
          ? { primaryAmenity: anchor.primaryAmenity }
          : {}),
        ...(label !== undefined ? { label } : {}),
      },
      dist
    );
  }

  return bestTarget;
}
