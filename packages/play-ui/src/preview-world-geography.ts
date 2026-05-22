/**
 * @module @agent-play/play-ui/preview-world-geography
 * Ephemeral human presence on the overworld (not snapshot-persisted).
 */

export const GEOGRAPHY_PUBLISH_INTERVAL_MS = 30_000;

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
