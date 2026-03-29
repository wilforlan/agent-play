import type { AgentRepository } from "@/server/agent-play/agent-repository";
import { PlayWorld } from "@/server/agent-play/play-world";
import { createRedisAgentRepository } from "@/server/agent-play/redis-agent-repository";

let worldPromise: Promise<PlayWorld> | null = null;
let repositoryInstance: AgentRepository | null | undefined;

function buildRepository():
  | ReturnType<typeof createRedisAgentRepository>
  | undefined {
  const redisUrl = process.env.REDIS_URL;
  if (typeof redisUrl === "string" && redisUrl.length > 0) {
    return createRedisAgentRepository({
      redisUrl,
      hostId: process.env.AGENT_PLAY_HOST_ID ?? "default",
    });
  }
  return undefined;
}

export async function getPlayWorld(): Promise<PlayWorld> {
  if (worldPromise === null) {
    worldPromise = (async () => {
      const port = process.env.PORT ?? "3000";
      const repository = buildRepository();
      repositoryInstance = repository ?? null;
      const w = new PlayWorld({
        previewBaseUrl:
          process.env.PLAY_PREVIEW_BASE_URL ??
          `http://127.0.0.1:${port}/agent-play/watch`,
        repository: repository ?? undefined,
      });
      await w.start();
      return w;
    })();
  }
  return worldPromise;
}

export async function getRepository(): Promise<AgentRepository | null> {
  await getPlayWorld();
  return repositoryInstance ?? null;
}
