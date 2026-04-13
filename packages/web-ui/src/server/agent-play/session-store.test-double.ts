import { randomUUID } from "node:crypto";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionEventLogEntry } from "./redis-session-store.js";
import { getPlayerChainGenesisSync } from "./load-player-chain-genesis.js";
import { buildPlayerChainFromSnapshot } from "./player-chain/index.js";
import { dispatchWorldFanoutLocal } from "./world-fanout-subscriber.js";
import type {
  PresenceLease,
  PersistSnapshotRev,
  PublishedSessionMetadata,
  SessionStore,
  WorldChatMessage,
  WorldFanoutOptions,
} from "./session-store.js";

const EVENT_LOG_MAX = 200;

export type TestSessionStoreOptions = {
  playerChainGenesis?: string;
};

export class TestSessionStore implements SessionStore {
  readonly fanoutDelivery = "local" as const;
  readonly playerChainGenesis: string;
  private sid: string | null = null;
  private snapshot: PreviewSnapshotJson | null = null;
  private rev = 0;
  private merkleRootHex: string | null = null;
  private merkleLeafCount: number | null = null;
  private readonly eventLog: SessionEventLogEntry[] = [];
  private readonly settings: Record<string, string> = {};
  private readonly worldChat: WorldChatMessage[] = [];
  private worldChatSeq = 0;
  private readonly presenceLeases = new Map<
    string,
    PresenceLease & { expiresAtMs: number }
  >();

  constructor(options: TestSessionStoreOptions = {}) {
    this.playerChainGenesis =
      options.playerChainGenesis ?? getPlayerChainGenesisSync();
  }

  getSessionId(): string {
    if (this.sid === null) {
      throw new Error(
        "TestSessionStore.getSessionId: loadOrCreateSessionId not completed"
      );
    }
    return this.sid;
  }

  async loadOrCreateSessionId(): Promise<string> {
    if (this.sid !== null) {
      return this.sid;
    }
    const id = randomUUID();
    this.sid = id;
    return id;
  }

  async isValidSession(sid: string): Promise<boolean> {
    if (sid.length === 0) return false;
    return this.sid !== null && this.sid === sid.trim();
  }

  async replaceSessionWithNewSid(newSid: string): Promise<void> {
    this.sid = newSid;
    this.snapshot = null;
    this.rev = 0;
    this.merkleRootHex = null;
    this.merkleLeafCount = null;
    this.eventLog.length = 0;
    this.worldChat.length = 0;
    this.worldChatSeq = 0;
    for (const k of Object.keys(this.settings)) {
      delete this.settings[k];
    }
  }

  async clearWorldSnapshot(): Promise<void> {
    this.snapshot = null;
    this.rev = 0;
    this.merkleRootHex = null;
    this.merkleLeafCount = null;
  }

  async appendWorldChatMessage(input: {
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
  }): Promise<{ message: WorldChatMessage; totalCount: number }> {
    this.worldChatSeq += 1;
    const message: WorldChatMessage = {
      seq: this.worldChatSeq,
      requestId: input.requestId,
      mainNodeId: input.mainNodeId,
      fromPlayerId: input.fromPlayerId,
      message: input.message,
      ts: input.ts,
    };
    this.worldChat.unshift(message);
    return { message, totalCount: this.worldChat.length };
  }

  async listWorldChatMessages(input: {
    limit: number;
    beforeSeq?: number;
  }): Promise<{ messages: WorldChatMessage[]; hasMore: boolean; totalCount: number }> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(input.limit)));
    const beforeSeq =
      typeof input.beforeSeq === "number" ? input.beforeSeq : undefined;
    const filtered =
      beforeSeq !== undefined
        ? this.worldChat.filter((m) => m.seq < beforeSeq)
        : this.worldChat;
    const messages = filtered.slice(0, safeLimit).map((m) => ({ ...m }));
    return {
      messages,
      hasMore: filtered.length > safeLimit,
      totalCount: this.worldChat.length,
    };
  }

  async getSnapshotJson(): Promise<PreviewSnapshotJson | null> {
    return this.snapshot;
  }

  async persistSnapshot(snapshot: PreviewSnapshotJson): Promise<void> {
    this.snapshot = snapshot;
    const chain = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    this.merkleRootHex = chain.merkleRootHex;
    this.merkleLeafCount = chain.merkleLeafCount;
  }

  async persistSnapshotReturningRev(
    snapshot: PreviewSnapshotJson
  ): Promise<PersistSnapshotRev> {
    this.snapshot = snapshot;
    this.rev += 1;
    const chain = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    this.merkleRootHex = chain.merkleRootHex;
    this.merkleLeafCount = chain.merkleLeafCount;
    return {
      rev: this.rev,
      merkleRootHex: chain.merkleRootHex,
      merkleLeafCount: chain.merkleLeafCount,
    };
  }

  async getSnapshotRev(): Promise<number> {
    return this.rev;
  }

  async publishWorldFanout(
    rev: number,
    event: string,
    data: unknown,
    options?: WorldFanoutOptions
  ): Promise<void> {
    const msg: {
      rev: number;
      event: string;
      data: unknown;
      merkleRootHex?: string;
      merkleLeafCount?: number;
      playerChainNotify?: WorldFanoutOptions["playerChainNotify"];
    } = { rev, event, data };
    if (
      options?.merkleRootHex !== undefined &&
      options.merkleRootHex.length > 0
    ) {
      msg.merkleRootHex = options.merkleRootHex;
    }
    if (
      options?.merkleLeafCount !== undefined &&
      Number.isFinite(options.merkleLeafCount)
    ) {
      msg.merkleLeafCount = options.merkleLeafCount;
    }
    if (options?.playerChainNotify !== undefined) {
      msg.playerChainNotify = options.playerChainNotify;
    }
    dispatchWorldFanoutLocal(msg);
  }

  async mergeSettings(partial: Record<string, string>): Promise<void> {
    if (Object.keys(partial).length === 0) return;
    Object.assign(this.settings, partial);
  }

  async appendEventLog(entry: SessionEventLogEntry): Promise<void> {
    this.eventLog.unshift({
      type: entry.type,
      at: entry.at,
      summary: entry.summary.slice(0, 4_000),
    });
    while (this.eventLog.length > EVENT_LOG_MAX) {
      this.eventLog.pop();
    }
  }

  async getPublishedMetadata(): Promise<PublishedSessionMetadata> {
    return {
      sid: this.sid,
      createdAt: null,
      updatedAt: null,
      lastSnapshotAt: null,
      lastEventAt:
        this.eventLog.length > 0 ? (this.eventLog[0]?.at ?? null) : null,
      snapshotBytes:
        this.snapshot !== null
          ? String(Buffer.byteLength(JSON.stringify(this.snapshot), "utf8"))
          : null,
      eventLogLength: this.eventLog.length,
      settings: { ...this.settings },
      merkleRootHex: this.merkleRootHex,
      merkleLeafCount: this.merkleLeafCount,
    };
  }

  async getRecentEventLog(limit: number): Promise<SessionEventLogEntry[]> {
    const n = Math.min(Math.max(limit, 1), EVENT_LOG_MAX);
    return this.eventLog.slice(0, n).map((e) => ({ ...e }));
  }

  private sweepPresence(nowMs: number): void {
    for (const [playerId, lease] of this.presenceLeases.entries()) {
      if (lease.expiresAtMs <= nowMs) {
        this.presenceLeases.delete(playerId);
      }
    }
  }

  async upsertPresenceLease(input: {
    playerId: string;
    agentId: string;
    sid: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<void> {
    const nowMs = Date.now();
    this.sweepPresence(nowMs);
    this.presenceLeases.set(input.playerId, {
      playerId: input.playerId,
      agentId: input.agentId,
      sid: input.sid,
      connectionId: input.connectionId,
      lastSeenAt: new Date(nowMs).toISOString(),
      expiresAtMs: nowMs + Math.max(1, Math.floor(input.ttlSeconds)) * 1000,
    });
  }

  async touchPresenceLease(input: {
    playerId: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<boolean> {
    const nowMs = Date.now();
    this.sweepPresence(nowMs);
    const lease = this.presenceLeases.get(input.playerId);
    if (lease === undefined) {
      return false;
    }
    if (lease.connectionId !== input.connectionId) {
      return false;
    }
    this.presenceLeases.set(input.playerId, {
      ...lease,
      lastSeenAt: new Date(nowMs).toISOString(),
      expiresAtMs: nowMs + Math.max(1, Math.floor(input.ttlSeconds)) * 1000,
    });
    return true;
  }

  async removePresenceLease(input: {
    playerId: string;
    connectionId?: string;
  }): Promise<void> {
    if (input.connectionId === undefined || input.connectionId.length === 0) {
      this.presenceLeases.delete(input.playerId);
      return;
    }
    const lease = this.presenceLeases.get(input.playerId);
    if (lease !== undefined && lease.connectionId === input.connectionId) {
      this.presenceLeases.delete(input.playerId);
    }
  }

  async hasPresenceLease(playerId: string): Promise<boolean> {
    this.sweepPresence(Date.now());
    return this.presenceLeases.has(playerId);
  }

  async listPresenceLeases(): Promise<PresenceLease[]> {
    this.sweepPresence(Date.now());
    return Array.from(this.presenceLeases.values()).map((lease) => ({
      playerId: lease.playerId,
      agentId: lease.agentId,
      sid: lease.sid,
      connectionId: lease.connectionId,
      lastSeenAt: lease.lastSeenAt,
    }));
  }
}
