import type Redis from "ioredis";

export function truncateForInspection(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…[truncated ${s.length - max} chars]`;
}

export async function sampleRedisValue(
  redis: Redis,
  key: string,
  type: string,
  previewMax: number
): Promise<unknown> {
  if (type === "string") {
    const v = await redis.get(key);
    if (v === null) return null;
    if (v.length > previewMax) {
      return truncateForInspection(v, previewMax);
    }
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return v;
    }
  }
  if (type === "hash") {
    const h = await redis.hgetall(key);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(h)) {
      if (v.length > previewMax) {
        out[k] = truncateForInspection(v, previewMax);
      } else {
        try {
          out[k] = JSON.parse(v) as unknown;
        } catch {
          out[k] = v;
        }
      }
    }
    return out;
  }
  if (type === "list") {
    const len = await redis.llen(key);
    const slice = await redis.lrange(key, 0, 24);
    const parsed = slice.map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return line.length > previewMax
          ? truncateForInspection(line, previewMax)
          : line;
      }
    });
    return { length: len, head: parsed };
  }
  if (type === "set") {
    const members = await redis.smembers(key);
    return { size: members.length, sample: members.slice(0, 50) };
  }
  if (type === "zset") {
    const n = await redis.zcard(key);
    const z = await redis.zrange(key, 0, 24, "WITHSCORES");
    return { length: n, head: z };
  }
  return { note: "unsupported type preview", type };
}

export type RedisKeyRow = {
  key: string;
  type: string;
  ttlSec: number | null;
  preview: unknown;
};

export type RedisInspectionPayload = {
  generatedAt: string;
  info: Record<string, string>;
  keyPrefix: string;
  keysScanned: number;
  keys: RedisKeyRow[];
};

function parseInfoSections(raw: string): Record<string, string> {
  const lines = raw.split(/\r?\n/);
  const flat: Record<string, string> = {};
  for (const line of lines) {
    if (line.length === 0 || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const k = line.slice(0, idx);
    const v = line.slice(idx + 1);
    flat[k] = v;
  }
  return flat;
}

export async function buildRedisInspectionPayload(
  redis: Redis,
  options: { keyPrefix: string; maxKeys: number; valuePreviewMax: number }
): Promise<RedisInspectionPayload> {
  const infoRaw = await redis.info();
  const info = parseInfoSections(infoRaw);
  const keys: RedisKeyRow[] = [];
  let cursor = "0";
  let scanned = 0;
  do {
    const reply = await redis.scan(
      cursor,
      "MATCH",
      `${options.keyPrefix}*`,
      "COUNT",
      64
    );
    cursor = reply[0];
    const batch = reply[1];
    for (const key of batch) {
      if (keys.length >= options.maxKeys) break;
      const type = await redis.type(key);
      const ttlSec = await redis.ttl(key);
      const ttl = ttlSec < 0 ? null : ttlSec;
      const preview = await sampleRedisValue(
        redis,
        key,
        type,
        options.valuePreviewMax
      );
      keys.push({
        key,
        type,
        ttlSec: ttl,
        preview,
      });
      scanned += 1;
    }
  } while (cursor !== "0" && keys.length < options.maxKeys);

  return {
    generatedAt: new Date().toISOString(),
    info,
    keyPrefix: options.keyPrefix,
    keysScanned: scanned,
    keys,
  };
}
