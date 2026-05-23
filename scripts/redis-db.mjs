#!/usr/bin/env node
/**
 * Redis database maintenance CLI: backup, wipe, and copy between logical DBs or instances.
 *
 * Usage:
 *   node scripts/redis-db.mjs backup --out ./backups/prod.jsonl
 *   node scripts/redis-db.mjs wipe --db 1 --yes
 *   node scripts/redis-db.mjs copy --from-db 0 --to-db 1 --wipe-target --yes
 *   node scripts/redis-db.mjs copy --from-url redis://127.0.0.1:6379/0 --to-url redis://127.0.0.1:6380/0 --yes
 *
 * Environment:
 *   REDIS_URL   Default Redis URL when --url / --from-url / --to-url are omitted
 */
import { config } from "dotenv";
import { createWriteStream, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { finished } from "node:stream/promises";
import Redis from "ioredis";

config({ path: resolve(process.cwd(), "/packages/web-ui/.env") });

const DEFAULT_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const SCAN_COUNT = 500;
const BACKUP_VERSION = 2;

function usage() {
  console.log(`redis-db — backup, wipe, and copy Redis databases

Usage:
  node scripts/redis-db.mjs <command> [options]

Commands:
  backup    Export keys to a JSONL file (type-aware; preserves values + TTL)
  restore   Load keys from a JSONL backup file
  wipe      Delete all keys in a database (or keys matching --pattern)
  copy      Copy every key from one database to another

Common options:
  --url <redis-url>       Redis URL (default: REDIS_URL or redis://127.0.0.1:6379)
  --db <n>                Logical database index 0-15 (default: 0)
  --pattern <glob>        Key pattern for scan (default: *)
  --help                  Show this help

backup:
  --out <path>            Output file (default: ./redis-backup-<timestamp>.jsonl)

restore:
  --in <path>             Input JSONL backup file (required)
  --replace               Overwrite existing keys

wipe:
  --yes                   Confirm destructive wipe (required)

copy:
  --from-url <url>        Source URL (default: --url)
  --to-url <url>          Destination URL (default: --url)
  --from-db <n>           Source DB index (default: 0)
  --to-db <n>             Destination DB index (default: 1)
  --wipe-target           FLUSHDB on destination before copy
  --replace               Overwrite keys that already exist on destination
  --yes                   Confirm copy (required; use with --wipe-target to reset destination first)

Examples:
  node scripts/redis-db.mjs backup --db 0 --out ./backups/before-migration.jsonl
  node scripts/redis-db.mjs wipe --db 1 --yes
  node scripts/redis-db.mjs copy --from-db 0 --to-db 1 --wipe-target --yes
  node scripts/redis-db.mjs restore --in ./backups/before-migration.jsonl --replace
`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {
    url: DEFAULT_URL,
    db: 0,
    fromUrl: "",
    toUrl: "",
    fromDb: 0,
    toDb: 1,
    out: "",
    inPath: "",
    pattern: "*",
    yes: false,
    wipeTarget: false,
    replace: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--yes") {
      flags.yes = true;
    } else if (arg === "--wipe-target") {
      flags.wipeTarget = true;
    } else if (arg === "--replace") {
      flags.replace = true;
    } else if (arg === "--url" && typeof argv[i + 1] === "string") {
      flags.url = argv[++i];
    } else if (arg === "--db" && typeof argv[i + 1] === "string") {
      flags.db = parseDbIndex(argv[++i], "--db");
    } else if (arg === "--from-url" && typeof argv[i + 1] === "string") {
      flags.fromUrl = argv[++i];
    } else if (arg === "--to-url" && typeof argv[i + 1] === "string") {
      flags.toUrl = argv[++i];
    } else if (arg === "--from-db" && typeof argv[i + 1] === "string") {
      flags.fromDb = parseDbIndex(argv[++i], "--from-db");
    } else if (arg === "--to-db" && typeof argv[i + 1] === "string") {
      flags.toDb = parseDbIndex(argv[++i], "--to-db");
    } else if (arg === "--out" && typeof argv[i + 1] === "string") {
      flags.out = argv[++i];
    } else if (arg === "--in" && typeof argv[i + 1] === "string") {
      flags.inPath = argv[++i];
    } else if (arg === "--pattern" && typeof argv[i + 1] === "string") {
      flags.pattern = argv[++i];
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { command: positional[0] ?? "", flags };
}

function parseDbIndex(raw, label) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 15) {
    throw new Error(`${label} must be an integer between 0 and 15`);
  }
  return n;
}

function createClient(url, db) {
  return new Redis(url, {
    db,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

function maskUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password.length > 0) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function connectionTarget(url, db) {
  return `${maskUrl(url)}#${String(db)}`;
}

function defaultBackupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(process.cwd(), `redis-backup-${stamp}.jsonl`);
}

function sameRedisEndpoint(aUrl, aDb, bUrl, bDb) {
  return aUrl === bUrl && aDb === bDb;
}

async function scanKeys(redis, pattern) {
  const keys = [];
  let cursor = "0";
  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      SCAN_COUNT
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

async function exportKeyRecord(redis, key) {
  const [type, pttl] = await Promise.all([redis.type(key), redis.pttl(key)]);
  if (type === "none") {
    return null;
  }

  const base = { v: BACKUP_VERSION, key, type, pttl };

  switch (type) {
    case "string":
      return { ...base, value: await redis.get(key) };
    case "hash":
      return { ...base, value: await redis.hgetall(key) };
    case "list":
      return { ...base, value: await redis.lrange(key, 0, -1) };
    case "set":
      return { ...base, value: await redis.smembers(key) };
    case "zset": {
      const raw = await redis.zrange(key, 0, -1, "WITHSCORES");
      const value = [];
      for (let i = 0; i < raw.length; i += 2) {
        value.push({ member: raw[i], score: Number(raw[i + 1]) });
      }
      return { ...base, value };
    }
    case "stream":
      return { ...base, value: await redis.xrange(key, "-", "+") };
    default:
      throw new Error(`Unsupported Redis type '${type}' for key '${key}'`);
  }
}

function validateBackupRecord(record, lineNo, filePath) {
  if (
    record === null ||
    typeof record !== "object" ||
    typeof record.key !== "string" ||
    typeof record.type !== "string" ||
    typeof record.pttl !== "number" ||
    !("value" in record)
  ) {
    throw new Error(`Invalid backup record on line ${String(lineNo)} in ${filePath}`);
  }
  return record;
}

async function applyTtl(redis, key, pttl) {
  if (pttl > 0) {
    await redis.pexpire(key, pttl);
  }
}

async function importKeyRecord(redis, record, replace) {
  const { key, type, value, pttl } = record;
  if (replace) {
    await redis.del(key);
  }

  switch (type) {
    case "string": {
      if (value === null) {
        return;
      }
      if (pttl > 0) {
        await redis.set(key, value, "PX", pttl);
      } else {
        await redis.set(key, value);
      }
      return;
    }
    case "hash": {
      const fields = value;
      if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
        throw new Error(`Invalid hash value for key '${key}'`);
      }
      const entries = Object.entries(fields);
      if (entries.length === 0) {
        return;
      }
      await redis.hset(key, fields);
      await applyTtl(redis, key, pttl);
      return;
    }
    case "list": {
      if (!Array.isArray(value)) {
        throw new Error(`Invalid list value for key '${key}'`);
      }
      if (value.length === 0) {
        return;
      }
      await redis.rpush(key, ...value);
      await applyTtl(redis, key, pttl);
      return;
    }
    case "set": {
      if (!Array.isArray(value)) {
        throw new Error(`Invalid set value for key '${key}'`);
      }
      if (value.length === 0) {
        return;
      }
      await redis.sadd(key, ...value);
      await applyTtl(redis, key, pttl);
      return;
    }
    case "zset": {
      if (!Array.isArray(value)) {
        throw new Error(`Invalid zset value for key '${key}'`);
      }
      if (value.length === 0) {
        return;
      }
      const args = [];
      for (const row of value) {
        if (
          typeof row !== "object" ||
          row === null ||
          typeof row.member !== "string" ||
          typeof row.score !== "number"
        ) {
          throw new Error(`Invalid zset member for key '${key}'`);
        }
        args.push(row.score, row.member);
      }
      await redis.zadd(key, ...args);
      await applyTtl(redis, key, pttl);
      return;
    }
    case "stream": {
      if (!Array.isArray(value)) {
        throw new Error(`Invalid stream value for key '${key}'`);
      }
      for (const entry of value) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new Error(`Invalid stream entry for key '${key}'`);
        }
        const [entryId, fields] = entry;
        if (typeof entryId !== "string" || typeof fields !== "object" || fields === null) {
          throw new Error(`Invalid stream entry for key '${key}'`);
        }
        const flat = [];
        for (const [field, fieldValue] of Object.entries(fields)) {
          flat.push(field, fieldValue);
        }
        await redis.xadd(key, entryId, ...flat);
      }
      await applyTtl(redis, key, pttl);
      return;
    }
    default:
      throw new Error(`Unsupported Redis type '${type}' for key '${key}'`);
  }
}

async function copyKeySameServer(source, destinationDb, key, replace) {
  const args = replace
    ? ["COPY", key, key, "DB", destinationDb, "REPLACE"]
    : ["COPY", key, key, "DB", destinationDb];
  const copied = await source.call(...args);
  return copied === 1;
}

async function runBackup(flags) {
  const outPath = resolve(flags.out.length > 0 ? flags.out : defaultBackupPath());
  mkdirSync(dirname(outPath), { recursive: true });

  const redis = createClient(flags.url, flags.db);
  try {
    await redis.ping();
    const keys = await scanKeys(redis, flags.pattern);
    const stream = createWriteStream(outPath, { encoding: "utf8" });
    let written = 0;
    let skipped = 0;

    for (const key of keys) {
      const record = await exportKeyRecord(redis, key);
      if (record === null) {
        skipped += 1;
        continue;
      }
      stream.write(`${JSON.stringify(record)}\n`);
      written += 1;
    }

    stream.end();
    await finished(stream);

    console.log(
      [
        "backup complete",
        `target=${connectionTarget(flags.url, flags.db)}`,
        `pattern=${flags.pattern}`,
        `keys=${String(keys.length)}`,
        `written=${String(written)}`,
        `skipped=${String(skipped)}`,
        `out=${outPath}`,
      ].join(" ")
    );
  } finally {
    await redis.quit();
  }
}

async function runRestore(flags) {
  if (flags.inPath.trim().length === 0) {
    throw new Error("restore requires --in <path>");
  }
  const inPath = resolve(flags.inPath);
  const redis = createClient(flags.url, flags.db);

  let restored = 0;
  try {
    await redis.ping();
    const raw = await readFile(inPath, "utf8");
    const lines = raw.split("\n");
    for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
      const trimmed = lines[lineNo]?.trim() ?? "";
      if (trimmed.length === 0) {
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new Error(`Invalid JSON on line ${String(lineNo + 1)} in ${inPath}`);
      }
      const record = validateBackupRecord(parsed, lineNo + 1, inPath);
      await importKeyRecord(redis, record, flags.replace);
      restored += 1;
    }
    console.log(
      [
        "restore complete",
        `target=${connectionTarget(flags.url, flags.db)}`,
        `in=${inPath}`,
        `restored=${String(restored)}`,
        `replace=${String(flags.replace)}`,
      ].join(" ")
    );
  } finally {
    await redis.quit();
  }
}

async function runWipe(flags) {
  if (!flags.yes) {
    throw new Error("wipe is destructive; pass --yes to confirm");
  }

  const redis = createClient(flags.url, flags.db);
  try {
    await redis.ping();
    if (flags.pattern === "*") {
      await redis.flushdb();
      console.log(
        [
          "wipe complete",
          `target=${connectionTarget(flags.url, flags.db)}`,
          "mode=flushdb",
        ].join(" ")
      );
      return;
    }

    const keys = await scanKeys(redis, flags.pattern);
    if (keys.length === 0) {
      console.log(
        [
          "wipe complete",
          `target=${connectionTarget(flags.url, flags.db)}`,
          "mode=pattern",
          "deleted=0",
        ].join(" ")
      );
      return;
    }

    const chunkSize = 500;
    let deleted = 0;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      deleted += await redis.del(...chunk);
    }
    console.log(
      [
        "wipe complete",
        `target=${connectionTarget(flags.url, flags.db)}`,
        "mode=pattern",
        `pattern=${flags.pattern}`,
        `deleted=${String(deleted)}`,
      ].join(" ")
    );
  } finally {
    await redis.quit();
  }
}

async function runCopy(flags) {
  if (!flags.yes) {
    throw new Error("copy writes to a destination database; pass --yes to confirm");
  }

  const fromUrl = flags.fromUrl.length > 0 ? flags.fromUrl : flags.url;
  const toUrl = flags.toUrl.length > 0 ? flags.toUrl : flags.url;

  if (sameRedisEndpoint(fromUrl, flags.fromDb, toUrl, flags.toDb)) {
    throw new Error("copy source and destination must differ (--from-db / --to-db or URLs)");
  }

  const source = createClient(fromUrl, flags.fromDb);
  const destination = createClient(toUrl, flags.toDb);
  const sameHost = fromUrl === toUrl;

  try {
    await Promise.all([source.ping(), destination.ping()]);

    if (flags.wipeTarget) {
      await destination.flushdb();
      console.log(`destination wiped target=${connectionTarget(toUrl, flags.toDb)}`);
    }

    const keys = await scanKeys(source, flags.pattern);
    let copied = 0;
    let skipped = 0;

    for (const key of keys) {
      if (sameHost) {
        const ok = await copyKeySameServer(source, flags.toDb, key, flags.replace);
        if (ok) {
          copied += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      const record = await exportKeyRecord(source, key);
      if (record === null) {
        skipped += 1;
        continue;
      }
      await importKeyRecord(destination, record, flags.replace);
      copied += 1;
    }

    console.log(
      [
        "copy complete",
        `from=${connectionTarget(fromUrl, flags.fromDb)}`,
        `to=${connectionTarget(toUrl, flags.toDb)}`,
        `pattern=${flags.pattern}`,
        `keys=${String(keys.length)}`,
        `copied=${String(copied)}`,
        `skipped=${String(skipped)}`,
        `mode=${sameHost ? "copy-db" : "export-import"}`,
        `wipe_target=${String(flags.wipeTarget)}`,
        `replace=${String(flags.replace)}`,
      ].join(" ")
    );
  } finally {
    await Promise.all([source.quit(), destination.quit()]);
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (flags.help || command.length === 0 || command === "help") {
    usage();
    process.exit(command.length === 0 && !flags.help ? 1 : 0);
  }

  switch (command) {
    case "backup":
      await runBackup(flags);
      break;
    case "restore":
      await runRestore(flags);
      break;
    case "wipe":
      await runWipe(flags);
      break;
    case "copy":
      await runCopy(flags);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
