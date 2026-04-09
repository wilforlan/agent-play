import type { PlayerChainFanoutNotify } from "./player-chain/index.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionEventLogEntry } from "./redis-session-store.js";

export type PublishedSessionMetadata = {
  sid: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSnapshotAt: string | null;
  lastEventAt: string | null;
  snapshotBytes: string | null;
  eventLogLength: number;
  settings: Record<string, string>;
  merkleRootHex: string | null;
  merkleLeafCount: number | null;
};

export type PersistSnapshotRev = {
  rev: number;
  merkleRootHex: string;
  merkleLeafCount: number;
};

export type WorldFanoutOptions = {
  merkleRootHex?: string;
  merkleLeafCount?: number;
  playerChainNotify?: PlayerChainFanoutNotify;
};

export type SessionStore = {
  readonly fanoutDelivery: "redis" | "local";
  readonly playerChainGenesis: string;
  getSessionId(): string;
  loadOrCreateSessionId(): Promise<string>;
  isValidSession(sid: string): Promise<boolean>;
  replaceSessionWithNewSid(newSid: string): Promise<void>;
  clearWorldSnapshot(): Promise<void>;
  getSnapshotJson(): Promise<PreviewSnapshotJson | null>;
  persistSnapshot(snapshot: PreviewSnapshotJson): Promise<void>;
  persistSnapshotReturningRev(
    snapshot: PreviewSnapshotJson
  ): Promise<PersistSnapshotRev>;
  getSnapshotRev(): Promise<number>;
  publishWorldFanout(
    rev: number,
    event: string,
    data: unknown,
    options?: WorldFanoutOptions
  ): Promise<void>;
  mergeSettings(partial: Record<string, string>): Promise<void>;
  appendEventLog(entry: SessionEventLogEntry): Promise<void>;
  getPublishedMetadata(): Promise<PublishedSessionMetadata>;
  getRecentEventLog(limit: number): Promise<SessionEventLogEntry[]>;
};
