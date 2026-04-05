import type { AgentRepository } from "@/server/agent-play/agent-repository";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { createRedisAgentRepository } from "@/server/agent-play/redis-agent-repository";
import { RedisSessionStore } from "@/server/agent-play/redis-session-store";
import { MemorySessionStore } from "@/server/agent-play/memory-session-store";
import type { WorldSessionStore } from "@/server/agent-play/world-session-store";
import { attachSessionStoreEventHooks } from "@/server/agent-play/session-store-hooks";
import { PlayWorld } from "@/server/agent-play/play-world";
import Redis from "ioredis";

let worldPromise: Promise<PlayWorld> | null = null;
let repositoryInstance: AgentRepository | null | undefined;
let sharedRedis: Redis | null = null;
let sessionStoreInstance: WorldSessionStore | null = null;

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

export function getSessionStore(): WorldSessionStore {
  if (sessionStoreInstance === null) {
    throw new Error("session store not initialized; await getPlayWorld() first");
  }
  return sessionStoreInstance;
}

export function getRedisSessionStore(): RedisSessionStore | null {
  return sessionStoreInstance instanceof RedisSessionStore
    ? sessionStoreInstance
    : null;
}

export function getSharedRedisClient(): Redis | null {
  return sharedRedis ?? getSharedRedis();
}

export { subscribeWorldFanout } from "@/server/agent-play/world-fanout-subscriber";

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
      const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
      const previewBaseUrl =
        process.env.PLAY_PREVIEW_BASE_URL ??
        `https://agent-play.vercel.app`;
      const redis = getSharedRedis();
      let repository: AgentRepository | undefined;
      let store: WorldSessionStore;
      if (redis !== null) {
        agentPlayVerbose("get-world", "REDIS_URL present — shared Redis + session store", {
          hostId,
        });
        repository = buildRepository(redis, hostId);
        repositoryInstance = repository;
        store = new RedisSessionStore({
          redis,
          hostId,
          previewBaseUrl,
        });
      } else {
        agentPlayVerbose("get-world", "no REDIS_URL — MemorySessionStore", {
          hostId,
        });
        repositoryInstance = null;
        store = new MemorySessionStore();
      }
      sessionStoreInstance = store;
      const w = new PlayWorld({
        previewBaseUrl,
        repository: repository ?? undefined,
        sessionStore: store,
      });
      await w.start();
      agentPlayVerbose("get-world", "PlayWorld.start finished", {
        sessionIdPrefix: `${w.getSessionId().slice(0, 8)}…`,
        fanoutDelivery: store.fanoutDelivery,
      });
      attachSessionStoreEventHooks(w, store);
      return w;
    })();
  }
  return worldPromise;
}

export async function getRepository(): Promise<AgentRepository | null> {
  await getPlayWorld();
  return repositoryInstance ?? null;
}
