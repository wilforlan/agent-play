/**
 * @module @agent-play/play-ui/preview-world-geography
 * Ephemeral human presence on the overworld (not snapshot-persisted).
 */

export const GEOGRAPHY_PUBLISH_INTERVAL_MS = 30_000;

/** Default pawn label length for node-id-style human ids. */
export const GEOGRAPHY_NODE_ID_LABEL_CHARS = 8;

export type WorldGeographyPresenceTickKind =
  | "noop"
  | "tick_mesh"
  | "ensure_mesh";

/**
 * True when world geography is enabled in settings but the AOI mesh session
 * is not running yet (e.g. saved checkbox on load).
 */
export function shouldEnsureWorldGeographyMesh(options: {
  worldGeographyEnabled: boolean;
  meshSessionActive: boolean;
}): boolean {
  return options.worldGeographyEnabled && !options.meshSessionActive;
}

/**
 * Decides what the presence tick should do for the current geography mode.
 * When the setting is on, never fall back to Redis pose publish — ensure the
 * mesh instead.
 */
export function resolveWorldGeographyPresenceTick(options: {
  worldGeographyEnabled: boolean;
  meshSessionActive: boolean;
}): WorldGeographyPresenceTickKind {
  if (!options.worldGeographyEnabled) {
    return "noop";
  }
  if (options.meshSessionActive) {
    return "tick_mesh";
  }
  return "ensure_mesh";
}

/**
 * Short label for a node id on the map pawn (about 8 chars by default).
 */
export function formatShortNodeId(
  id: string,
  maxChars: number = GEOGRAPHY_NODE_ID_LABEL_CHARS
): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return trimmed.slice(0, maxChars);
}

export type GeographyPresencePayload = {
  humanId: string;
  name: string;
  x: number;
  y: number;
  facing: "left" | "right";
  isMoving: boolean;
};

export async function postGeographyPresence(options: {
  apiBase: string;
  sid: string;
} & GeographyPresencePayload): Promise<void> {
  const url = `${options.apiBase.replace(/\/$/, "")}/geography?sid=${encodeURIComponent(options.sid)}`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: options.humanId,
      humanId: options.humanId,
      name: options.name,
      x: options.x,
      y: options.y,
      facing: options.facing,
      isMoving: options.isMoving,
    }),
  });
}

export async function postGeographyLeave(options: {
  apiBase: string;
  sid: string;
  humanId: string;
}): Promise<void> {
  const url = `${options.apiBase.replace(/\/$/, "")}/geography?sid=${encodeURIComponent(options.sid)}`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      humanId: options.humanId,
      leave: true,
    }),
  });
}
