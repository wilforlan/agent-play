import { z } from "zod";
import { PurchaseRecordSchema } from "./space-content-model.js";

const NonEmpty = z.string().trim().min(1);
const IsoTimestamp = z.string().trim().min(1);

export const ScannerTxOpSchema = z.enum([
  "purchase",
  "redeemWalletBundle",
  "applyGameOutcome",
  "talkTick",
  "talkStop",
  "talkStart",
  "walletSeeded",
]);

export type ScannerTxOp = z.infer<typeof ScannerTxOpSchema>;

/**
 * Explorer row for a wallet / APU transaction indexed globally.
 *
 * @public
 */
export const ScannerTxRecordSchema = PurchaseRecordSchema.extend({
  hostId: NonEmpty,
  indexedAt: IsoTimestamp,
  op: ScannerTxOpSchema,
  blockRev: z.number().int().nonnegative().optional(),
  merkleRootHex: z.string().optional(),
});

export type ScannerTxRecord = z.infer<typeof ScannerTxRecordSchema>;

/**
 * Snapshot revision block indexed by the scanner.
 *
 * @public
 */
export const ScannerBlockRecordSchema = z.object({
  rev: z.number().int().nonnegative(),
  merkleRootHex: z.string(),
  merkleLeafCount: z.number().int().nonnegative(),
  at: IsoTimestamp,
  occupantCount: z.number().int().nonnegative().optional(),
  leafDeltaCount: z.number().int().nonnegative().optional(),
  label: z.string().optional(),
});

export type ScannerBlockRecord = z.infer<typeof ScannerBlockRecordSchema>;

export const ScannerMigrationStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export type ScannerMigrationStatus = z.infer<typeof ScannerMigrationStatusSchema>;

/**
 * Backfill progress for scanner indexes.
 *
 * @public
 */
export const ScannerMigrationStateSchema = z.object({
  status: ScannerMigrationStatusSchema,
  cursor: z.string(),
  totalIndexed: z.number().int().nonnegative(),
  startedAt: IsoTimestamp,
  completedAt: IsoTimestamp.optional(),
  error: z.string().optional(),
});

export type ScannerMigrationState = z.infer<typeof ScannerMigrationStateSchema>;

/**
 * Cached wallet snapshot for scanner supply metrics.
 *
 * @public
 */
export const ScannerWalletSnapshotSchema = z.object({
  playerId: NonEmpty,
  balanceUsd: z.number().finite().nonnegative(),
  powerUps: z.number().int().nonnegative(),
  updatedAt: IsoTimestamp,
});

export type ScannerWalletSnapshot = z.infer<typeof ScannerWalletSnapshotSchema>;

/**
 * Chain head + KPI strip for the scanner dashboard.
 *
 * @public
 */
export const ScannerHeadSchema = z.object({
  generatedAt: IsoTimestamp,
  hostId: NonEmpty,
  snapshotRev: z.number().int().nonnegative(),
  merkleRootHex: z.string().nullable(),
  merkleLeafCount: z.number().int().nonnegative().nullable(),
  sid: z.string().nullable(),
  txsLast24h: z.number().int().nonnegative(),
  apuMintedLast24h: z.number().int().nonnegative(),
  apuBurnedLast24h: z.number().int().nonnegative(),
  migrationStatus: ScannerMigrationStatusSchema,
});

export type ScannerHead = z.infer<typeof ScannerHeadSchema>;

export const ScannerNodeKindSchema = z.enum(["main", "agent", "unknown"]);

export type ScannerNodeKind = z.infer<typeof ScannerNodeKindSchema>;

export const ScannerNodeWalletSchema = z.object({
  balanceUsd: z.number().finite().nonnegative(),
  powerUps: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  updatedAt: IsoTimestamp,
});

export type ScannerNodeWallet = z.infer<typeof ScannerNodeWalletSchema>;

export const ScannerNodeLedgerKpisSchema = z.object({
  txCount: z.number().int().nonnegative(),
  usdSpent: z.number().finite().nonnegative(),
  apuMinted: z.number().int().nonnegative(),
  apuBurned: z.number().int().nonnegative(),
  lastTxAt: IsoTimestamp.nullable(),
});

export type ScannerNodeLedgerKpis = z.infer<typeof ScannerNodeLedgerKpisSchema>;

export const ScannerNodeBreakdownSchema = z.object({
  byAmenityKind: z.record(z.string(), z.number().int().nonnegative()),
  bySpaceId: z.record(z.string(), z.number().int().nonnegative()),
  byToken: z.object({
    usd: z.number().finite().nonnegative(),
    apu: z.number().int().nonnegative(),
  }),
});

export type ScannerNodeBreakdown = z.infer<typeof ScannerNodeBreakdownSchema>;

export const ScannerNodeAnalyticsKpisSchema = z.object({
  eventsLast24h: z.number().int().nonnegative(),
  topEvents: z.array(
    z.object({
      event: NonEmpty,
      count: z.number().int().nonnegative(),
    })
  ),
});

export type ScannerNodeAnalyticsKpis = z.infer<
  typeof ScannerNodeAnalyticsKpisSchema
>;

export const ScannerNodeProfileSchema = z.object({
  nodeId: NonEmpty,
  kind: ScannerNodeKindSchema,
  generatedAt: IsoTimestamp,
  wallet: ScannerNodeWalletSchema.nullable(),
  ledger: ScannerNodeLedgerKpisSchema,
  breakdown: ScannerNodeBreakdownSchema,
  txs: z.array(ScannerTxRecordSchema),
  txsNextCursor: z.string().nullable(),
  gameStats: z
    .object({
      dayStreak: z.number().int().min(0),
      bestStreak: z.number().int().min(0),
      puEarnedToday: z.number().int().min(0),
      puCapRemaining: z.number().int().min(0),
      gamesPlayedToday: z.number().int().min(0),
      featuredGameId: z.string(),
      firstGamePlayed: z.boolean(),
      perGame: z.record(
        z.string(),
        z.object({
          plays: z.number().int().min(0),
          bestNetPu: z.number().int(),
        })
      ),
    })
    .nullable(),
  analyticsEvents: z.array(
    z.object({
      messageId: NonEmpty,
      event: NonEmpty,
      distinctId: NonEmpty,
      timestamp: IsoTimestamp,
      properties: z.record(
        z.union([z.string(), z.number(), z.boolean(), z.null()])
      ),
    })
  ),
  analyticsEventsNextCursor: z.string().nullable(),
  analytics: ScannerNodeAnalyticsKpisSchema,
  traits: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
});

export type ScannerNodeProfile = z.infer<typeof ScannerNodeProfileSchema>;
