import Redis from "ioredis";

let shared: Redis | null = null;

export function getRedis(): Redis | null {
  if (shared !== null) return shared;
  const url = process.env.REDIS_URL;
  if (typeof url !== "string" || url.length === 0) return null;
  shared = new Redis(url);
  return shared;
}

export function hostId(): string {
  return process.env.AGENT_PLAY_HOST_ID ?? "default";
}
