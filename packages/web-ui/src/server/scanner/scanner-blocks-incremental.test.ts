import { describe, expect, it } from "vitest";
import { listScannerBlocks } from "./scanner-blocks.js";
import { scannerBlocksKey } from "./scanner-keys.js";

type MockRedis = {
  lists: Map<string, string[]>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  llen: (key: string) => Promise<number>;
};

const createMockRedis = (): MockRedis => {
  const lists = new Map<string, string[]>();
  return {
    lists,
    async lrange(key, start, stop) {
      const list = lists.get(key) ?? [];
      return list.slice(start, stop + 1);
    },
    async llen(key) {
      return lists.get(key)?.length ?? 0;
    },
  };
};

describe("listScannerBlocks incremental", () => {
  it("returns only blocks with rev greater than sinceRev", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const key = scannerBlocksKey(hostId);
    redis.lists.set(key, [
      JSON.stringify({
        rev: 3,
        merkleRootHex: "abc",
        merkleLeafCount: 1,
        at: "2026-01-03T00:00:00.000Z",
      }),
      JSON.stringify({
        rev: 2,
        merkleRootHex: "def",
        merkleLeafCount: 1,
        at: "2026-01-02T00:00:00.000Z",
      }),
      JSON.stringify({
        rev: 1,
        merkleRootHex: "ghi",
        merkleLeafCount: 1,
        at: "2026-01-01T00:00:00.000Z",
      }),
    ]);

    const page = await listScannerBlocks({
      redis: redis as never,
      hostId,
      limit: 10,
      sinceRev: 1,
    });

    expect(page.blocks.map((block) => block.rev)).toEqual([3, 2]);
    expect(page.nextSinceRev).toBe(3);
    expect(page.nextCursor).toBeNull();
  });
});
