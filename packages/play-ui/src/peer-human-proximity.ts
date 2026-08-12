import {
  DEFAULT_PROXIMITY_RADIUS,
  findNearestProximityPartner,
} from "./proximity-interaction.js";

export type FindNearestHumanPartnerOptions = {
  localHumanId: string;
  positions: ReadonlyMap<string, { x: number; y: number }>;
  remoteHumanIds: ReadonlySet<string>;
  radius?: number;
};

export const findNearestHumanPartner = (
  options: FindNearestHumanPartnerOptions
): string | null => {
  const localId = options.localHumanId.trim();
  if (localId.length === 0) {
    return null;
  }
  const positions = new Map(options.positions);
  const localPos =
    positions.get(localId) ?? positions.get("__human__") ?? null;
  if (localPos === null) {
    return null;
  }
  positions.set(localId, localPos);
  return findNearestProximityPartner({
    primaryId: localId,
    positions,
    radius: options.radius ?? DEFAULT_PROXIMITY_RADIUS,
    allowedPartnerIds: options.remoteHumanIds,
  });
};
