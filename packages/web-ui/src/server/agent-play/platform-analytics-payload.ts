import type Redis from "ioredis";
import type { PreviewSnapshotJson } from "./preview-serialize.js";

export type PlatformAnalyticsDefinitions = {
  mainNodeAccounts: string;
  agentNodeCredentials: string;
  genesisNode: string;
  inWorldAgents: string;
  registrationsByMonth: string;
  agentNodesPerMainAccount: string;
};

export type PlatformAnalyticsCards = {
  genesisNodeCount: number;
  mainNodeAccounts: number;
  agentNodeCredentials: number;
  inWorldAgentRecords: number;
};

export type PlatformAnalyticsSeries = {
  nodesCreatedByMonth: ReadonlyArray<{ period: string; count: number }>;
};

export type AgentsPerMainHistogram = {
  mainsWithZeroAgentNodes: number;
  mainsWithOneAgentNode: number;
  mainsWithTwoOrMoreAgentNodes: number;
};

export type PlatformAnalyticsPlayerChain = {
  sessionSid: string | null;
  merkleLeafCount: number | null;
  eventLogLength: number;
  snapshotOccupantCount: number | null;
  occupantKinds: {
    human: number;
    agent: number;
    mcp: number;
  } | null;
};

export type PlatformAnalyticsPayload = {
  generatedAt: string;
  hostId: string;
  definitions: PlatformAnalyticsDefinitions;
  cards: PlatformAnalyticsCards;
  series: PlatformAnalyticsSeries;
  playerChain: PlatformAnalyticsPlayerChain;
  agentsPerMainHistogram: AgentsPerMainHistogram;
};

const MAX_KEYS = 4000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function monthKeyFromIso(iso: string): string | null {
  const m = /^(\d{4}-\d{2})/.exec(iso);
  return m !== null && m[1] !== undefined ? m[1] : null;
}

function sessionHashKey(hostId: string): string {
  return `agent-play:${hostId}:session`;
}

function snapshotKey(hostId: string): string {
  return `agent-play:${hostId}:session:snapshot`;
}

function eventLogKey(hostId: string): string {
  return `agent-play:${hostId}:session:eventlog`;
}

function parseSnapshotOccupants(
  raw: string | null
): Pick<PlatformAnalyticsPlayerChain, "snapshotOccupantCount" | "occupantKinds"> {
  if (raw === null || raw.length === 0) {
    return { snapshotOccupantCount: null, occupantKinds: null };
  }
  try {
    const snap = JSON.parse(raw) as PreviewSnapshotJson;
    const occ = snap.worldMap?.occupants;
    if (!Array.isArray(occ)) {
      return { snapshotOccupantCount: null, occupantKinds: null };
    }
    let human = 0;
    let agent = 0;
    let mcp = 0;
    for (const o of occ) {
      if (o.kind === "human") human += 1;
      else if (o.kind === "agent") agent += 1;
      else if (o.kind === "mcp") mcp += 1;
    }
    return {
      snapshotOccupantCount: occ.length,
      occupantKinds: { human, agent, mcp },
    };
  } catch {
    return { snapshotOccupantCount: null, occupantKinds: null };
  }
}

export async function buildPlatformAnalyticsPayload(options: {
  redis: Redis;
  hostId: string;
}): Promise<PlatformAnalyticsPayload> {
  const { redis, hostId } = options;
  const prefix = `agent-play:${hostId}:`;

  const mainAuthKeys: string[] = [];
  const agentNodeKeys: string[] = [];
  let cursor = "0";
  let scanned = 0;
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      `${prefix}node:*`,
      "COUNT",
      128
    );
    cursor = next;
    for (const key of batch) {
      if (scanned >= MAX_KEYS) break;
      scanned += 1;
      if (key.includes(":auth:agent-node:")) {
        agentNodeKeys.push(key);
      } else if (key.endsWith(":auth")) {
        mainAuthKeys.push(key);
      }
    }
  } while (cursor !== "0" && scanned < MAX_KEYS);

  const mainRe = new RegExp(
    `^${escapeRegex(prefix)}node:([^:]+):auth$`
  );
  const agentNodeRe = new RegExp(
    `^${escapeRegex(prefix)}node:([^:]+):auth:agent-node:([^:]+)$`
  );

  let genesisNodeCount = 0;
  let mainNodeAccounts = 0;
  const monthCounts = new Map<string, number>();
  const agentsPerMain = new Map<string, number>();
  const mainNodeIds: string[] = [];

  for (const key of mainAuthKeys) {
    const m = mainRe.exec(key);
    if (m === null || m[1] === undefined) continue;
    const nodeId = m[1];
    const raw = await redis.hgetall(key);
    const kind = raw.kind;
    const createdAt =
      typeof raw.createdAt === "string" ? raw.createdAt : "";
    if (kind === "root") {
      genesisNodeCount += 1;
    } else if (kind === "main") {
      mainNodeAccounts += 1;
      mainNodeIds.push(nodeId);
    }
    const mk = monthKeyFromIso(createdAt);
    if (mk !== null) {
      monthCounts.set(mk, (monthCounts.get(mk) ?? 0) + 1);
    }
  }

  for (const key of agentNodeKeys) {
    const m = agentNodeRe.exec(key);
    if (m === null || m[1] === undefined) continue;
    const mainId = m[1];
    agentsPerMain.set(mainId, (agentsPerMain.get(mainId) ?? 0) + 1);
  }

  let mainsWithZeroAgentNodes = 0;
  let mainsWithOneAgentNode = 0;
  let mainsWithTwoOrMoreAgentNodes = 0;
  for (const id of mainNodeIds) {
    const n = agentsPerMain.get(id) ?? 0;
    if (n === 0) mainsWithZeroAgentNodes += 1;
    else if (n === 1) mainsWithOneAgentNode += 1;
    else mainsWithTwoOrMoreAgentNodes += 1;
  }

  let inWorldAgentRecords = 0;
  cursor = "0";
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      `${prefix}agent:*`,
      "COUNT",
      128
    );
    cursor = next;
    inWorldAgentRecords += batch.length;
    if (inWorldAgentRecords >= MAX_KEYS) break;
  } while (cursor !== "0");

  const sess = await redis.hgetall(sessionHashKey(hostId));
  const eventLogLength = await redis.llen(eventLogKey(hostId));
  const snapRaw = await redis.get(snapshotKey(hostId));
  const leafRaw = sess.merkleLeafCount;
  const leafN =
    leafRaw !== undefined && leafRaw.length > 0 ? Number(leafRaw) : NaN;
  const merkleLeafCount = Number.isFinite(leafN) ? leafN : null;
  const occ = parseSnapshotOccupants(snapRaw);

  const monthsSorted = Array.from(monthCounts.keys()).sort();
  const nodesCreatedByMonth = monthsSorted.map((period) => ({
    period,
    count: monthCounts.get(period) ?? 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    hostId,
    definitions: {
      mainNodeAccounts:
        "Main node identity records registered under this deployment (kind main).",
      agentNodeCredentials:
        "Credential keys for agent nodes attached under a main account.",
      genesisNode:
        "Platform genesis (root) node record — typically one per deployment.",
      inWorldAgents:
        "In-world agent entity records (distinct from agent-node credential keys).",
      registrationsByMonth:
        "Count of main and root node auth rows by creation month (existing records only).",
      agentNodesPerMainAccount:
        "How many main accounts have zero, one, or multiple registered agent-node credentials.",
    },
    cards: {
      genesisNodeCount,
      mainNodeAccounts,
      agentNodeCredentials: agentNodeKeys.length,
      inWorldAgentRecords,
    },
    series: {
      nodesCreatedByMonth,
    },
    playerChain: {
      sessionSid: sess.sid ?? null,
      merkleLeafCount,
      eventLogLength,
      snapshotOccupantCount: occ.snapshotOccupantCount,
      occupantKinds: occ.occupantKinds,
    },
    agentsPerMainHistogram: {
      mainsWithZeroAgentNodes,
      mainsWithOneAgentNode,
      mainsWithTwoOrMoreAgentNodes,
    },
  };
}
