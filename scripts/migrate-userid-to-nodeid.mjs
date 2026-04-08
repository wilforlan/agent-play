#!/usr/bin/env node
import { createHash } from "node:crypto";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";

if (typeof redisUrl !== "string" || redisUrl.length === 0) {
  console.error("REDIS_URL is required");
  process.exit(1);
}

const redis = new Redis(redisUrl);

function deriveLegacyNodeId(userId) {
  return createHash("sha256")
    .update(`legacy-user:${userId}`, "utf8")
    .digest("hex");
}

async function run() {
  const pattern = `agent-play:${hostId}:agent:*`;
  let cursor = "0";
  let migrated = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", "500");
    cursor = nextCursor;
    for (const key of keys) {
      const row = await redis.hgetall(key);
      if (typeof row.nodeId === "string" && row.nodeId.length > 0) {
        continue;
      }
      const legacyUserId = row.userId;
      if (typeof legacyUserId !== "string" || legacyUserId.length === 0) {
        continue;
      }
      const nodeId = deriveLegacyNodeId(legacyUserId);
      const agentId = row.agentId;
      if (typeof agentId !== "string" || agentId.length === 0) {
        continue;
      }
      const pipe = redis.multi();
      pipe.hset(key, "nodeId", nodeId);
      pipe.hdel(key, "userId");
      pipe.srem(`agent-play:${hostId}:user:${legacyUserId}:agents`, agentId);
      pipe.sadd(`agent-play:${hostId}:node:${nodeId}:agents`, agentId);
      await pipe.exec();
      migrated += 1;
    }
  } while (cursor !== "0");

  console.log(`migrated_agents=${String(migrated)}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await redis.quit();
  });

