import type Redis from "ioredis";
import { PlayerWalletSchema } from "@agent-play/sdk";
import { scannerWalletKey, scannerWalletsKey } from "./scanner-keys.js";

const SCAN_COUNT = 200;

export type ScannerNodeRow = {
  readonly nodeId: string;
  readonly kind: "main" | "agent" | "unknown";
  readonly balanceUsd: number | null;
  readonly powerUps: number | null;
};

export const listScannerNodes = async (input: {
  redis: Redis;
  hostId: string;
  limit: number;
  cursor?: string;
}): Promise<{ nodes: ScannerNodeRow[]; nextCursor: string | null }> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const offset =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor)
      : 0;

  const mainAuthKeys: string[] = [];
  const agentNodeKeys: string[] = [];
  let scanCursor = "0";
  let scanned = 0;
  do {
    const [next, batch] = await input.redis.scan(
      scanCursor,
      "MATCH",
      `agent-play:${input.hostId}:*`,
      "COUNT",
      SCAN_COUNT
    );
    scanCursor = next;
    for (const key of batch) {
      if (key.endsWith(":main-auth")) mainAuthKeys.push(key);
      if (key.includes(":agent-node:")) agentNodeKeys.push(key);
      scanned += 1;
      if (scanned > 4000) break;
    }
  } while (scanCursor !== "0" && scanned <= 4000);

  const nodeIds = new Set<string>();
  for (const key of mainAuthKeys) {
    const id = key.split(":").at(-2);
    if (id !== undefined) nodeIds.add(id);
  }
  for (const key of agentNodeKeys) {
    const parts = key.split(":");
    const id = parts.at(-1);
    if (id !== undefined) nodeIds.add(id);
  }

  const walletIds = await input.redis.zrevrange(
    scannerWalletsKey(input.hostId),
    0,
    500
  );
  for (const id of walletIds) nodeIds.add(id);

  const sorted = [...nodeIds].sort();
  const slice = sorted.slice(offset, offset + limit);
  const nodes: ScannerNodeRow[] = [];

  for (const nodeId of slice) {
    const raw = await input.redis.get(scannerWalletKey(input.hostId, nodeId));
    let balanceUsd: number | null = null;
    let powerUps: number | null = null;
    if (raw !== null) {
      try {
        const wallet = PlayerWalletSchema.parse(JSON.parse(raw));
        balanceUsd = wallet.balanceUsd;
        powerUps = wallet.powerUps;
      } catch {
        balanceUsd = null;
        powerUps = null;
      }
    }
    const kind: ScannerNodeRow["kind"] = mainAuthKeys.some((k) =>
      k.includes(`:${nodeId}:main-auth`)
    )
      ? "main"
      : agentNodeKeys.some((k) => k.endsWith(`:${nodeId}`))
        ? "agent"
        : "unknown";
    nodes.push({ nodeId, kind, balanceUsd, powerUps });
  }

  const nextOffset = offset + limit;
  const nextCursor =
    nextOffset < sorted.length ? String(nextOffset) : null;
  return { nodes, nextCursor };
};

export const getScannerNodeDetail = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<{
  nodeId: string;
  wallet: ReturnType<typeof PlayerWalletSchema.parse> | null;
  purchases: Awaited<ReturnType<import("../agent-play/session-store.js").SessionStore["listPurchases"]>>;
  gameStats: import("@agent-play/sdk").GameStats | null;
}> => {
  const walletRaw = await input.redis.get(
    `agent-play:${input.hostId}:player:${input.nodeId}:wallet`
  );
  let wallet = null;
  if (walletRaw !== null) {
    try {
      wallet = PlayerWalletSchema.parse(JSON.parse(walletRaw));
    } catch {
      wallet = null;
    }
  }

  const purchasesRaw = await input.redis.lrange(
    `agent-play:${input.hostId}:player:${input.nodeId}:purchases`,
    0,
    49
  );
  const purchases = [];
  for (const line of purchasesRaw) {
    try {
      purchases.push(JSON.parse(line));
    } catch {
      continue;
    }
  }

  const gameRaw = await input.redis.get(
    `agent-play:${input.hostId}:player:${input.nodeId}:game-state`
  );
  let gameStats = null;
  if (gameRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(gameRaw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "stats" in parsed
      ) {
        gameStats = (parsed as { stats: import("@agent-play/sdk").GameStats })
          .stats;
      }
    } catch {
      gameStats = null;
    }
  }

  return {
    nodeId: input.nodeId,
    wallet,
    purchases,
    gameStats,
  };
};
