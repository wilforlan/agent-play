import { z } from "zod";

const NonEmpty = z.string().trim().min(1);
const IsoTimestamp = z.string().trim().min(1);

export const AnalyticsPropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type AnalyticsPropertyValue = z.infer<typeof AnalyticsPropertyValueSchema>;

export const AnalyticsContextSchema = z.object({
  hostId: NonEmpty,
  sid: z.string().optional(),
  snapshotRev: z.number().int().nonnegative().optional(),
  library: z.enum(["agent-play-server", "agent-play-client"]),
});

export type AnalyticsContext = z.infer<typeof AnalyticsContextSchema>;

/**
 * Segment-style track envelope for in-platform analytics.
 *
 * @public
 */
export const AnalyticsEventSchema = z.object({
  messageId: NonEmpty,
  event: NonEmpty,
  distinctId: NonEmpty,
  timestamp: IsoTimestamp,
  properties: z.record(AnalyticsPropertyValueSchema),
  context: AnalyticsContextSchema.optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/**
 * Segment-style identify envelope for node traits.
 *
 * @public
 */
export const AnalyticsTraitsSchema = z.object({
  distinctId: NonEmpty,
  traits: z.record(AnalyticsPropertyValueSchema),
  timestamp: IsoTimestamp,
});

export type AnalyticsTraits = z.infer<typeof AnalyticsTraitsSchema>;

export const AnalyticsMigrationStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export type AnalyticsMigrationStatus = z.infer<
  typeof AnalyticsMigrationStatusSchema
>;

export const AnalyticsMigrationStateSchema = z.object({
  status: AnalyticsMigrationStatusSchema,
  cursor: z.string(),
  totalIndexed: z.number().int().nonnegative(),
  startedAt: IsoTimestamp,
  completedAt: IsoTimestamp.optional(),
  error: z.string().optional(),
});

export type AnalyticsMigrationState = z.infer<
  typeof AnalyticsMigrationStateSchema
>;

export const ANALYTICS_EVENT_NAMES = {
  purchaseCompleted: "Purchase Completed",
  walletBundleRedeemed: "Wallet Bundle Redeemed",
  gameRoundCompleted: "Game Round Completed",
  talkSessionStarted: "Talk Session Started",
  talkSessionBilled: "Talk Session Billed",
  talkSessionEnded: "Talk Session Ended",
  walletSeeded: "Wallet Seeded",
  spaceEntered: "Space Entered",
  amenityEntered: "Amenity Entered",
  worldJourneyRecorded: "World Journey Recorded",
  worldInteractionRecorded: "World Interaction Recorded",
  playerAdded: "Player Added",
  chainRevisionPublished: "Chain Revision Published",
  uiPresentationAction: "UI Presentation Action",
  gameStageActivated: "Game Stage Activated",
  scannerViewOpened: "Scanner View Opened",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT_NAMES)[keyof typeof ANALYTICS_EVENT_NAMES];
