import Redis from "ioredis";
import {
  parseWorldFanoutMessage,
  worldFanoutChannel,
  type WorldFanoutMessage,
} from "./redis-world-fanout.js";

let subscriberRedis: Redis | null = null;
let fanoutHandlersAttached = false;
const fanoutListeners = new Set<(m: WorldFanoutMessage) => void>();
let fanoutSubscribePromise: Promise<void> | null = null;

export function dispatchWorldFanoutLocal(message: WorldFanoutMessage): void {
  for (const listener of [...fanoutListeners]) {
    try {
      listener(message);
    } catch {
      //
    }
  }
}

function getSubscriberRedis(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (typeof redisUrl !== "string" || redisUrl.length === 0) {
    return null;
  }
  if (subscriberRedis === null) {
    subscriberRedis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return subscriberRedis;
}

export function subscribeWorldFanout(
  listener: (message: WorldFanoutMessage) => void
): () => void {
  fanoutListeners.add(listener);
  void ensureWorldFanoutSubscribed();
  return () => {
    fanoutListeners.delete(listener);
  };
}

async function ensureWorldFanoutSubscribed(): Promise<void> {
  if (fanoutSubscribePromise !== null) {
    return fanoutSubscribePromise;
  }
  const sub = getSubscriberRedis();
  if (sub === null) {
    fanoutSubscribePromise = Promise.resolve();
    return fanoutSubscribePromise;
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const channel = worldFanoutChannel(hostId);
  fanoutSubscribePromise = (async () => {
    if (fanoutHandlersAttached) return;
    fanoutHandlersAttached = true;
    await sub.subscribe(channel);
    sub.on("message", (ch, message) => {
      if (ch !== channel) return;
      const parsed = parseWorldFanoutMessage(message);
      if (parsed === null) return;
      for (const l of [...fanoutListeners]) {
        try {
          l(parsed);
        } catch {
          //
        }
      }
    });
  })();
  return fanoutSubscribePromise;
}
