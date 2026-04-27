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
