import type { AgentRepository } from "@/server/agent-play/agent-repository";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { createRedisAgentRepository } from "@/server/agent-play/redis-agent-repository";
import { RedisSessionStore } from "@/server/agent-play/redis-session-store";
import { attachSessionStoreEventHooks } from "@/server/agent-play/session-store-hooks";
import { PlayWorld } from "@/server/agent-play/play-world";
import Redis from "ioredis";

let worldPromise: Promise<PlayWorld> | null = null;
let repositoryInstance: AgentRepository | null | undefined;
let sharedRedis: Redis | null = null;
let sessionStoreInstance: RedisSessionStore | null = null;

function getSharedRedis(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (typeof redisUrl !== "string" || redisUrl.length === 0) {
    return null;
  }
  if (sharedRedis === null) {
    sharedRedis = new Redis(redisUrl);
  }
  return sharedRedis;
}

export function getRedisSessionStore(): RedisSessionStore | null {
  return sessionStoreInstance;
}

export function getSharedRedisClient(): Redis | null {
  return sharedRedis ?? getSharedRedis();
}

function buildRepository(
  redis: Redis,
  hostId: string
): ReturnType<typeof createRedisAgentRepository> {
  return createRedisAgentRepository({ redis, hostId });
}

export async function getPlayWorld(): Promise<PlayWorld> {
  if (worldPromise === null) {
    worldPromise = (async () => {
      agentPlayVerbose("get-world", "initializing PlayWorld singleton");
      const port = process.env.PORT ?? "3000";
      const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
      const previewBaseUrl =
        process.env.PLAY_PREVIEW_BASE_URL ??
        `https://agent-play.vercel.app`;
      const redis = getSharedRedis();
      let repository: AgentRepository | undefined;
      if (redis !== null) {
        agentPlayVerbose("get-world", "REDIS_URL present — shared Redis + session store", {
          hostId,
        });
        repository = buildRepository(redis, hostId);
        repositoryInstance = repository;
        sessionStoreInstance = new RedisSessionStore({
          redis,
          hostId,
          previewBaseUrl,
        });
      } else {
        agentPlayVerbose("get-world", "no REDIS_URL — in-memory session id only", {
          hostId,
        });
        repositoryInstance = null;
        sessionStoreInstance = null;
      }
      const w = new PlayWorld({
        previewBaseUrl,
        repository: repository ?? undefined,
        sessionStore: sessionStoreInstance ?? undefined,
      });
      await w.start();
      agentPlayVerbose("get-world", "PlayWorld.start finished", {
        sessionIdPrefix: `${w.getSessionId().slice(0, 8)}…`,
        hasSessionStore: sessionStoreInstance !== null,
      });
      if (sessionStoreInstance !== null) {
        attachSessionStoreEventHooks(w, sessionStoreInstance);
      }
      return w;
    })();
  }
  return worldPromise;
}

export async function getRepository(): Promise<AgentRepository | null> {
  await getPlayWorld();
  return repositoryInstance ?? null;
}
