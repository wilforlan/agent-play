import type Redis from "ioredis";
import {
  ScannerBlockRecordSchema,
  type ScannerBlockRecord,
} from "@agent-play/sdk";
import { scannerBlocksKey } from "./scanner-keys.js";

export const listScannerBlocks = async (input: {
  redis: Redis;
  hostId: string;
  limit: number;
  cursor?: string;
  sinceRev?: number;
}): Promise<{
  blocks: ScannerBlockRecord[];
  nextCursor: string | null;
  nextSinceRev?: number | null;
}> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);

  if (input.sinceRev !== undefined && Number.isFinite(input.sinceRev)) {
    const raw = await input.redis.lrange(
      scannerBlocksKey(input.hostId),
      0,
      limit * 3 - 1
    );
    const blocks: ScannerBlockRecord[] = [];
    let nextSinceRev: number | null = null;
    for (const line of raw) {
      try {
        const block = ScannerBlockRecordSchema.parse(JSON.parse(line));
        if (block.rev <= input.sinceRev) break;
        blocks.push(block);
        nextSinceRev =
          nextSinceRev === null ? block.rev : Math.max(nextSinceRev, block.rev);
        if (blocks.length >= limit) break;
      } catch {
        continue;
      }
    }
    return { blocks, nextCursor: null, nextSinceRev };
  }

  const offset =
    input.cursor !== undefined && input.cursor.length > 0
      ? Number(input.cursor)
      : 0;
  const raw = await input.redis.lrange(
    scannerBlocksKey(input.hostId),
    offset,
    offset + limit - 1
  );
  const blocks: ScannerBlockRecord[] = [];
  for (const line of raw) {
    try {
      blocks.push(ScannerBlockRecordSchema.parse(JSON.parse(line)));
    } catch {
      continue;
    }
  }
  const total = await input.redis.llen(scannerBlocksKey(input.hostId));
  const nextCursor =
    offset + limit < total ? String(offset + limit) : null;
  return { blocks, nextCursor };
};

export const getScannerBlock = async (input: {
  redis: Redis;
  hostId: string;
  rev: number;
}): Promise<ScannerBlockRecord | null> => {
  const raw = await input.redis.lrange(scannerBlocksKey(input.hostId), 0, 9999);
  for (const line of raw) {
    try {
      const block = ScannerBlockRecordSchema.parse(JSON.parse(line));
      if (block.rev === input.rev) return block;
    } catch {
      continue;
    }
  }
  return null;
};

export const getScannerLeaf = async (input: {
  redis: Redis;
  hostId: string;
  stableKey: string;
}): Promise<{ stableKey: string; leafDigestHex: string | null }> => {
  const raw = await input.redis.hget(
    `agent-play:${input.hostId}:player-chain:leaves`,
    input.stableKey
  );
  return {
    stableKey: input.stableKey,
    leafDigestHex: raw,
  };
};
