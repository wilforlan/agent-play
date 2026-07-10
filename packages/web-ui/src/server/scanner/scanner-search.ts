import type Redis from "ioredis";
import { getScannerTx } from "./scanner-indexer.js";
import { getAnalyticsEvent } from "../analytics/analytics-tracker.js";

export type ScannerSearchResult = {
  readonly kind: "tx" | "node" | "analytics" | "none";
  readonly id: string;
};

export const searchScanner = async (input: {
  redis: Redis;
  hostId: string;
  query: string;
}): Promise<ScannerSearchResult> => {
  const q = input.query.trim();
  if (q.length === 0) return { kind: "none", id: "" };

  const tx = await getScannerTx({
    redis: input.redis,
    hostId: input.hostId,
    txId: q,
  });
  if (tx !== null) return { kind: "tx", id: q };

  const analytics = await getAnalyticsEvent({
    redis: input.redis,
    hostId: input.hostId,
    messageId: q,
  });
  if (analytics !== null) return { kind: "analytics", id: q };

  const walletKey = `agent-play:${input.hostId}:scanner:wallet:${q}`;
  const wallet = await input.redis.get(walletKey);
  if (wallet !== null) return { kind: "node", id: q };

  const playerWalletKey = `agent-play:${input.hostId}:player:${q}:wallet`;
  const playerWallet = await input.redis.get(playerWalletKey);
  if (playerWallet !== null) return { kind: "node", id: q };

  return { kind: "none", id: q };
};
