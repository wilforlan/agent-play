import type {
  AgentRepository,
  CreateAgentNodeRecordInput,
  CreateAgentRecordResult,
  CreateNodeRecordInput,
  CreateNodeResult,
  NodeAuthRecord,
  NodeKind,
  StoredAgentRecord,
} from "./agent-repository.js";
import Redis from "ioredis";
import { MAX_AGENTS_PER_ACCOUNT } from "./account-limits.js";
import {
  createNodeCredentialMaterial,
  deriveNodeIdFromMaterial,
  verifyStoredNodeCredential,
} from "@agent-play/node-tools";
import { getPlayerChainGenesisSync } from "./load-player-chain-genesis.js";

const ZONE_FLAG_THRESHOLD = 100;

function agentKey(hostId: string, agentId: string): string {
  return `agent-play:${hostId}:agent:${agentId}`;
}

function userAgentsKey(hostId: string, nodeId: string): string {
  return `agent-play:${hostId}:node:${nodeId}:agents`;
}

function nodeAuthKey(hostId: string, nodeId: string): string {
  return `agent-play:${hostId}:node:${nodeId}:auth`;
}

function agentNodeOwnerKey(
  hostId: string,
  accountId: string,
  agentId: string
): string {
  return `${nodeAuthKey(hostId, accountId)}:agent-node:${agentId}`;
}

function parseAgentNodeIds(raw: string | undefined): string[] {
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function parseNodeKind(raw: string | undefined): NodeKind {
  if (
    raw === "root" ||
    raw === "main" ||
    raw === "agent" ||
    raw === "space"
  ) {
    return raw;
  }
  return "main";
}

function recordToHash(rec: StoredAgentRecord): Record<string, string> {
  const o: Record<string, string> = {
    agentId: rec.agentId,
    nodeId: rec.nodeId,
    name: rec.name,
    toolNames: JSON.stringify(rec.toolNames),
    zoneCount: String(rec.zoneCount),
    yieldCount: String(rec.yieldCount),
    flagged: rec.flagged ? "1" : "0",
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
  return o;
}

function hashToRecord(h: Record<string, string>): StoredAgentRecord | null {
  const agentId = h.agentId;
  const nodeId = h.nodeId;
  const name = h.name;
  const toolNamesRaw = h.toolNames;
  if (
    agentId === undefined ||
    nodeId === undefined ||
    nodeId.length === 0 ||
    name === undefined ||
    toolNamesRaw === undefined
  ) {
    return null;
  }
  let toolNames: string[] = [];
  try {
    const p = JSON.parse(toolNamesRaw) as unknown;
    if (Array.isArray(p)) {
      toolNames = p.filter((x): x is string => typeof x === "string");
    }
  } catch {
    return null;
  }
  return {
    agentId,
    nodeId,
    name,
    toolNames,
    zoneCount: Number(h.zoneCount ?? 0),
    yieldCount: Number(h.yieldCount ?? 0),
    flagged: h.flagged === "1",
    createdAt: h.createdAt ?? new Date(0).toISOString(),
    updatedAt: h.updatedAt ?? new Date(0).toISOString(),
  };
}

export type RedisAgentRepositoryOptions = {
  redis: Redis;
  hostId: string;
  rootKey: string;
};

export class RedisAgentRepository implements AgentRepository {
  private readonly redis: Redis;
  private readonly hostId: string;
  private readonly rootKey: string;

  constructor(options: RedisAgentRepositoryOptions) {
    this.redis = options.redis;
    this.hostId = options.hostId;
    this.rootKey = options.rootKey;
  }

  getGenesisNodeId(): string {
    return this.rootKey;
  }

  private async ensureRootNodeExists(): Promise<void> {
    const authKey = nodeAuthKey(this.hostId, this.rootKey);
    const exists = await this.redis.exists(authKey);
    if (exists === 1) {
      return;
    }
    await this.redis.hset(authKey, {
      nodeId: this.rootKey,
      kind: "root",
      createdAt: new Date().toISOString(),
      agentNodeIds: JSON.stringify([]),
    });
  }

  async validateNodeIdentity(input: {
    nodeId: string;
    rootKey: string;
    mainNodeId?: string;
    passwHash?: string;
  }): Promise<{ ok: boolean; reason?: string; nodeKind?: NodeKind }> {
    await this.ensureRootNodeExists();
    const nodeAuth = await this.redis.hgetall(nodeAuthKey(this.hostId, input.nodeId));
    if (Object.keys(nodeAuth).length === 0) {
      return { ok: false, reason: "node not found" };
    }
    const nodeKind = parseNodeKind(nodeAuth.kind);
    if (nodeKind === "root") {
      return {
        ok: input.nodeId === input.rootKey,
        reason: input.nodeId === input.rootKey ? undefined : "root mismatch",
        nodeKind,
      };
    }
    const passwHash = nodeAuth.passwHash;
    if (typeof passwHash !== "string" || passwHash.length === 0) {
      return { ok: false, reason: "missing passwHash", nodeKind };
    }
    const derivativeOk = verifyStoredNodeCredential({
      nodeId: input.nodeId,
      passwHash,
      rootKey: input.rootKey,
    });
    if (!derivativeOk) {
      return { ok: false, reason: "derivative mismatch", nodeKind };
    }
    if (
      typeof input.passwHash === "string" &&
      input.passwHash.length > 0 &&
      passwHash !== input.passwHash
    ) {
      return { ok: false, reason: "passwHash mismatch", nodeKind };
    }
    if (nodeKind === "agent" && input.mainNodeId !== undefined) {
      const parentNodeId = nodeAuth.parentNodeId;
      if (parentNodeId !== input.mainNodeId) {
        return { ok: false, reason: "agent parent mismatch", nodeKind };
      }
    }
    return { ok: true, nodeKind };
  }

  async findAccountIdForAgentNode(agentId: string): Promise<string | null> {
    const pattern = `agent-play:${this.hostId}:node:*:auth:agent-node:${agentId}`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        200
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        const key = keys[0];
        if (typeof key === "string" && key.length > 0) {
          const m = key.match(
            new RegExp(
              `^agent-play:${this.hostId}:node:(.+):auth:agent-node:${agentId}$`
            )
          );
          if (m !== null && typeof m[1] === "string" && m[1].length > 0) {
            return m[1];
          }
        }
      }
    } while (cursor !== "0");
    return null;
  }

  private async hasAttachedAgentNode(input: {
    accountId: string;
    agentId: string;
  }): Promise<boolean> {
    const value = await this.redis.get(
      agentNodeOwnerKey(this.hostId, input.accountId, input.agentId)
    );
    return value !== null;
  }

  async deleteMainNodeCascade(
    nodeId: string
  ): Promise<{ deletedAgentCount: number }> {
    await this.ensureRootNodeExists();
    if (nodeId === this.rootKey) {
      throw new Error("deleteMainNodeCascade: cannot delete genesis node");
    }
    const authKey = nodeAuthKey(this.hostId, nodeId);
    const exists = await this.redis.exists(authKey);
    if (exists !== 1) {
      return { deletedAgentCount: 0 };
    }
    const setKey = userAgentsKey(this.hostId, nodeId);
    const ids = await this.redis.smembers(setKey);
    const auth = await this.redis.hgetall(authKey);
    const attachedAgentNodeIds = parseAgentNodeIds(auth.agentNodeIds);
    const pipe = this.redis.multi();
    for (const id of ids) {
      pipe.del(agentKey(this.hostId, id));
    }
    for (const id of attachedAgentNodeIds) {
      pipe.del(agentNodeOwnerKey(this.hostId, nodeId, id));
    }
    pipe.del(setKey);
    pipe.del(authKey);
    await pipe.exec();
    return { deletedAgentCount: ids.length };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult> {
    await this.ensureRootNodeExists();
    if (input.kind === "main") {
      const nodeId = input.nodeId.trim().toLowerCase();
      const passwHash = input.passwHash;
      if (
        !verifyStoredNodeCredential({
          nodeId,
          passwHash,
          rootKey: this.rootKey,
        })
      ) {
        throw new Error(
          "createNode: nodeId is not a valid derivative of passwHash under the current root key"
        );
      }
      const authKey = nodeAuthKey(this.hostId, nodeId);
      const exists = await this.redis.exists(authKey);
      if (exists === 1) {
        throw new Error("createNode: node already exists");
      }
      const createdAt = new Date().toISOString();
      await this.redis.hset(authKey, {
        nodeId,
        kind: "main",
        parentNodeId: this.rootKey,
        createdAt,
        passwHash,
        agentNodeIds: JSON.stringify([]),
      });
      return { nodeId };
    }
    const spaceId = input.spaceId.trim();
    if (spaceId.length === 0) {
      throw new Error("createNode: spaceId required for kind=space");
    }
    let passwHash = input.passwHash ?? "";
    let nodeId: string;
    let phraseOut: string | undefined;
    if (passwHash.length === 0) {
      const generated = createNodeCredentialMaterial({ rootKey: this.rootKey });
      passwHash = generated.passwHash;
      nodeId = generated.nodeId;
      phraseOut = generated.phrase;
    } else {
      nodeId = deriveNodeIdFromMaterial({
        material: passwHash,
        rootKey: this.rootKey,
      });
    }
    const authKey = nodeAuthKey(this.hostId, nodeId);
    const exists = await this.redis.exists(authKey);
    if (exists === 1) {
      throw new Error("createNode: node already exists");
    }
    const createdAt = new Date().toISOString();
    await this.redis.hset(authKey, {
      nodeId,
      kind: "space",
      spaceId,
      parentNodeId: this.rootKey,
      createdAt,
      passwHash,
      agentNodeIds: JSON.stringify([]),
    });
    return phraseOut !== undefined ? { nodeId, phrase: phraseOut } : { nodeId };
  }

  async verifyNodePasswHash(input: {
    nodeId: string;
    passwHash: string;
  }): Promise<boolean> {
    await this.ensureRootNodeExists();
    const raw = await this.redis.hgetall(nodeAuthKey(this.hostId, input.nodeId));
    if (Object.keys(raw).length === 0) return false;
    const kind = parseNodeKind(raw.kind);
    if (kind === "root") {
      return false;
    }
    const stored = raw.passwHash;
    if (typeof stored !== "string" || stored.length === 0) {
      return false;
    }
    if (stored !== input.passwHash) {
      return false;
    }
    return verifyStoredNodeCredential({
      nodeId: input.nodeId,
      passwHash: input.passwHash,
      rootKey: this.rootKey,
    });
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    await this.ensureRootNodeExists();
    const raw = await this.redis.hgetall(nodeAuthKey(this.hostId, nodeId));
    if (Object.keys(raw).length === 0) return null;
    if (typeof raw.createdAt !== "string") {
      return null;
    }
    const kind = parseNodeKind(raw.kind);
    const record: NodeAuthRecord = {
      nodeId,
      kind,
      parentNodeId: raw.parentNodeId,
      passwHash: raw.passwHash,
      createdAt: raw.createdAt,
      agentNodeIds: parseAgentNodeIds(raw.agentNodeIds),
    };
    if (kind === "space" && typeof raw.spaceId === "string" && raw.spaceId.length > 0) {
      record.spaceId = raw.spaceId;
    }
    return record;
  }

  async createAgentNode(
    input: CreateAgentNodeRecordInput
  ): Promise<CreateAgentRecordResult> {
    await this.ensureRootNodeExists();
    const authKey = nodeAuthKey(this.hostId, input.parentNodeId);
    const raw = await this.redis.hgetall(authKey);
    if (Object.keys(raw).length === 0) {
      throw new Error("createAgentNode: parent main node does not exist");
    }
    if (parseNodeKind(raw.kind) !== "main") {
      throw new Error("createAgentNode: parent must be a main node");
    }
    const existingIds = parseAgentNodeIds(raw.agentNodeIds);
    if (existingIds.length >= MAX_AGENTS_PER_ACCOUNT) {
      throw new Error(
        `createAgentNode: account agent limit reached (max ${String(MAX_AGENTS_PER_ACCOUNT)})`
      );
    }
    if (existingIds.includes(input.agentId)) {
      throw new Error("createAgentNode: agent node already attached");
    }
    const alreadyAttached = await this.hasAttachedAgentNode({
      accountId: input.parentNodeId,
      agentId: input.agentId,
    });
    if (alreadyAttached) {
      throw new Error("createAgentNode: agent node already attached");
    }
    if (
      !verifyStoredNodeCredential({
        nodeId: input.agentId,
        passwHash: input.passwHash,
        rootKey: this.rootKey,
      })
    ) {
      throw new Error(
        "createAgentNode: agentNodeId is not a valid derivative of passwHash under the current root key"
      );
    }
    const nextIds = [...existingIds, input.agentId];
    const pipe = this.redis.multi();
    pipe.hset(authKey, "agentNodeIds", JSON.stringify(nextIds));
    pipe.hset(nodeAuthKey(this.hostId, input.agentId), {
      nodeId: input.agentId,
      kind: "agent",
      parentNodeId: input.parentNodeId,
      passwHash: input.passwHash,
      createdAt: new Date().toISOString(),
      agentNodeIds: JSON.stringify([]),
    });
    pipe.set(
      agentNodeOwnerKey(this.hostId, input.parentNodeId, input.agentId),
      JSON.stringify({ passwHash: input.passwHash })
    );
    await pipe.exec();
    return { agentId: input.agentId };
  }

  async getAgent(agentId: string): Promise<StoredAgentRecord | null> {
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return null;
    return hashToRecord(raw);
  }

  async listAgentsForNode(userId: string): Promise<StoredAgentRecord[]> {
    const ids = await this.redis.smembers(
      userAgentsKey(this.hostId, userId)
    );
    const out: StoredAgentRecord[] = [];
    for (const id of ids) {
      const r = await this.getAgent(id);
      if (r !== null) out.push(r);
    }
    return out;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return false;
    const rec = hashToRecord(raw);
    if (rec === null) return false;
    const pipe = this.redis.multi();
    pipe.del(agentKey(this.hostId, agentId));
    pipe.srem(userAgentsKey(this.hostId, rec.nodeId), agentId);
    await pipe.exec();
    return true;
  }

  async incrementZoneCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const key = agentKey(this.hostId, agentId);
    const n = await this.redis.hincrby(key, "zoneCount", 1);
    const flagged = n >= ZONE_FLAG_THRESHOLD ? "1" : "0";
    await this.redis.hset(key, "flagged", flagged);
    await this.redis.hset(key, "updatedAt", new Date().toISOString());
    return this.getAgent(agentId);
  }

  async incrementYieldCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const key = agentKey(this.hostId, agentId);
    await this.redis.hincrby(key, "yieldCount", 1);
    await this.redis.hset(key, "updatedAt", new Date().toISOString());
    return this.getAgent(agentId);
  }
}

export function createRedisAgentRepository(options: {
  redisUrl?: string;
  hostId: string;
  redis?: Redis;
  rootKey?: string;
}): RedisAgentRepository {
  const rootKey =
    typeof options.rootKey === "string" && options.rootKey.length > 0
      ? options.rootKey
      : getPlayerChainGenesisSync();
  if (options.redis !== undefined) {
    return new RedisAgentRepository({
      redis: options.redis,
      hostId: options.hostId,
      rootKey,
    });
  }
  const url = options.redisUrl;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("createRedisAgentRepository: redisUrl or redis is required");
  }
  const redis = new Redis(url);
  return new RedisAgentRepository({ redis, hostId: options.hostId, rootKey });
}
