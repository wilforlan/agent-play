import type Redis from "ioredis";
import { RedisSessionStore } from "./redis-session-store.js";
import type { SessionStore } from "./session-store.js";

export type LoadSessionStoreContext = {
  redis: Redis;
  hostId: string;
  previewBaseUrl?: string;
};

export type SessionStoreFactory = (ctx: LoadSessionStoreContext) => SessionStore;

const defaultFactory: SessionStoreFactory = (ctx) =>
  new RedisSessionStore({
    redis: ctx.redis,
    hostId: ctx.hostId,
    previewBaseUrl: ctx.previewBaseUrl,
  });

let injectedFactory: SessionStoreFactory | null = null;

export function setSessionStoreFactory(factory: SessionStoreFactory | null): void {
  injectedFactory = factory;
}

export function loadSessionStore(ctx: LoadSessionStoreContext): SessionStore {
  const factory = injectedFactory ?? defaultFactory;
  return factory(ctx);
}
