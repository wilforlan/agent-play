/**
 * @module @agent-play/play-ui/proximity-interaction
 * proximity interaction — preview canvas module (Pixi + DOM).
 */
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

/**
 * World-cell distance at which the human triggers a structure / space
 * proximity prompt. The detector measures from the player to the
 * **compound centroid** (where the building sprite is drawn), not to any
 * single anchor, so this radius covers "stepping onto the front of the
 * building" rather than "standing on the centroid".
 *
 * @public
 */
export const DEFAULT_STRUCTURE_PROXIMITY_RADIUS = 2.4;

/**
 * Minimal structure shape consumed by
 * {@link findNearestStructureProximityTarget}. The play canvas's `Structure`
 * row in `main.ts` already satisfies this contract.
 *
 * @public
 */
export type StructureProximityInput = {
  id: string;
  x: number;
  y: number;
  spaceIds?: readonly string[];
  primaryAmenity?: string;
  label?: string;
  name?: string;
};

/**
 * Result returned by {@link findNearestStructureProximityTarget}. The
 * centroid is averaged across every structure that shares the matched
 * `spaceId` so the prompt anchors at the visual center of a compound.
 *
 * @public
 */
export type StructureProximityTarget = {
  structureId: string;
  spaceId: string;
  centroid: { x: number; y: number };
  primaryAmenity?: string;
  label?: string;
};

/**
 * Find the closest structure / space-compound the player can interact with.
 *
 * @remarks
 * Structures are first **grouped by `spaceId`** (a single space may be
 * anchored by several structures, e.g. a multi-amenity compound), and the
 * centroid of each group is the proximity target. Measuring against the
 * centroid matches how the building is rendered: the on-canvas sprite sits
 * at the average of the underlying anchor points, so the prompt activates
 * exactly when the player visually overlaps the building. Structures with
 * no `spaceId` are ignored — the prompt is for entering a **space**, not a
 * tool stall.
 *
 * @public
 */
export function findNearestStructureProximityTarget(options: {
  player: { x: number; y: number };
  structures: ReadonlyArray<StructureProximityInput>;
  radius: number;
}): StructureProximityTarget | null {
  const eligible = options.structures.filter(
    (st) => Array.isArray(st.spaceIds) && st.spaceIds.length > 0
  );
  if (eligible.length === 0) return null;
  const compounds = new Map<string, StructureProximityInput[]>();
  for (const st of eligible) {
    const spaceId = st.spaceIds?.[0];
    if (spaceId === undefined) continue;
    const arr = compounds.get(spaceId) ?? [];
    arr.push(st);
    compounds.set(spaceId, arr);
  }
  let best: {
    spaceId: string;
    group: StructureProximityInput[];
    centroid: { x: number; y: number };
    dist: number;
  } | null = null;
  for (const [spaceId, group] of compounds) {
    const cx = group.reduce((s, st) => s + st.x, 0) / group.length;
    const cy = group.reduce((s, st) => s + st.y, 0) / group.length;
    const dist = Math.hypot(cx - options.player.x, cy - options.player.y);
    if (dist > options.radius) continue;
    if (best === null || dist < best.dist) {
      best = { spaceId, group, centroid: { x: cx, y: cy }, dist };
    }
  }
  if (best === null) return null;
  const anchor = best.group[0];
  if (anchor === undefined) return null;
  const result: StructureProximityTarget = {
    structureId: anchor.id,
    spaceId: best.spaceId,
    centroid: best.centroid,
  };
  if (anchor.primaryAmenity !== undefined) {
    result.primaryAmenity = anchor.primaryAmenity;
  }
  const label = anchor.label ?? anchor.name;
  if (label !== undefined) {
    result.label = label;
  }
  return result;
}
