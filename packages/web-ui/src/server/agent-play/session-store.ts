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

export type PresenceLease = {
  playerId: string;
  agentId: string;
  sid: string;
  connectionId: string;
  lastSeenAt: string;
};

export type WorldChatMessage = {
  seq: number;
  requestId: string;
  mainNodeId: string;
  fromPlayerId: string;
  message: string;
  ts: string;
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
  upsertPresenceLease(input: {
    playerId: string;
    agentId: string;
    sid: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<void>;
  touchPresenceLease(input: {
    playerId: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<boolean>;
  removePresenceLease(input: {
    playerId: string;
    connectionId?: string;
  }): Promise<void>;
  hasPresenceLease(playerId: string): Promise<boolean>;
  listPresenceLeases(): Promise<PresenceLease[]>;
  appendWorldChatMessage(input: {
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
  }): Promise<{ message: WorldChatMessage; totalCount: number }>;
  listWorldChatMessages(input: {
    limit: number;
    beforeSeq?: number;
  }): Promise<{ messages: WorldChatMessage[]; hasMore: boolean; totalCount: number }>;
};
