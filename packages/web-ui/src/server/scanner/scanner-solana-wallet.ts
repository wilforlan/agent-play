import type Redis from "ioredis";
import { solanaWalletKey } from "./scanner-keys.js";

const parseLinkedSolanaAddress = (raw: string | null): string | null => {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("address" in parsed) || typeof parsed.address !== "string") {
      return null;
    }
    if (parsed.address.length === 0) return null;
    if ("status" in parsed && parsed.status !== "active") return null;
    return parsed.address;
  } catch {
    return null;
  }
};

export const readLinkedSolanaAddress = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
}): Promise<string | null> => {
  const raw = await input.redis.get(solanaWalletKey(input.hostId, input.nodeId));
  return parseLinkedSolanaAddress(raw);
};

export const readLinkedSolanaWallets = async (input: {
  redis: Redis;
  hostId: string;
  from: string;
  to: string | null;
}): Promise<{ from: string | null; to: string | null }> => {
  const fromAddress = await readLinkedSolanaAddress({
    redis: input.redis,
    hostId: input.hostId,
    nodeId: input.from,
  });
  const toAddress =
    input.to === null
      ? null
      : await readLinkedSolanaAddress({
          redis: input.redis,
          hostId: input.hostId,
          nodeId: input.to,
        });
  return { from: fromAddress, to: toAddress };
};
