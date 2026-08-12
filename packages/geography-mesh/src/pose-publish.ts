import { GEOGRAPHY_POSE_PUBLISH_MAX_HZ } from "./constants.js";
import type { GeographyPose } from "./schemas.js";

export type PosePublishDecision = {
  shouldPublish: boolean;
  reason: "first" | "interval" | "delta" | "facing" | "moving" | "skip";
};

export type ShouldPublishPoseOptions = {
  previous: GeographyPose | null;
  next: GeographyPose;
  nowMs: number;
  lastPublishMs: number | null;
  maxHz?: number;
  minDistance?: number;
};

export const shouldPublishPose = (
  options: ShouldPublishPoseOptions
): PosePublishDecision => {
  const {
    previous,
    next,
    nowMs,
    lastPublishMs,
  } = options;
  const maxHz = options.maxHz ?? GEOGRAPHY_POSE_PUBLISH_MAX_HZ;
  const minDistance = options.minDistance ?? 0.05;
  const minIntervalMs = 1000 / maxHz;

  if (previous === null || lastPublishMs === null) {
    return { shouldPublish: true, reason: "first" };
  }
  if (nowMs - lastPublishMs < minIntervalMs) {
    return { shouldPublish: false, reason: "skip" };
  }
  if (previous.facing !== next.facing) {
    return { shouldPublish: true, reason: "facing" };
  }
  if (previous.isMoving !== next.isMoving) {
    return { shouldPublish: true, reason: "moving" };
  }
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  if (Math.hypot(dx, dy) >= minDistance) {
    return { shouldPublish: true, reason: "delta" };
  }
  return { shouldPublish: false, reason: "skip" };
};
