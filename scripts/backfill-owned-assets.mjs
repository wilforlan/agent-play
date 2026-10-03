#!/usr/bin/env node
/**
 * Backfill per-player `owned-assets` Redis sets for amenity purchases made
 * before the Assets / transfer-sale feature shipped.
 *
 * Why: older `executePurchase` calls marked amenity items sold and appended
 * purchase history, but never `SADD`ed
 * `agent-play:{hostId}:player:{playerId}:owned-assets`. The Assets tab only
 * reads that set, so pre-feature buys are invisible and cannot be listed for
 * sale until this index is rebuilt.
 *
 * Source of truth: live amenity item hashes (shop / supermarket / car wash).
 * For each item with `sale.soldToPlayerId` and status `sold` or
 * `transfer_available`, ensure the encoded ownership ref is in that player's
 * set. Idempotent via Redis `SADD`.
 *
 * Usage:
 *   node scripts/backfill-owned-assets.mjs
 *   node scripts/backfill-owned-assets.mjs --apply
 *   REDIS_URL=redis://… AGENT_PLAY_HOST_ID=default node scripts/backfill-owned-assets.mjs --apply
 *   node scripts/backfill-owned-assets.mjs --url redis://… --host-id default --apply
 *
 * Environment:
 *   REDIS_URL            Redis connection URL (required unless --url is set)
 *   AGENT_PLAY_HOST_ID   Host prefix for keys (default: default)
 *
 * Flags:
 *   --url <redis-url>    Override REDIS_URL
 *   --host-id <id>       Override AGENT_PLAY_HOST_ID
 *   --apply              Write SADD updates (default is dry-run report only)
 *   --help               Show this help
 */
import Redis from "ioredis";

const SEP = "\u001f";
const SCAN_COUNT = 500;
const OWNED_STATUSES = new Set(["sold", "transfer_available"]);

const AMENITY_SUFFIXES = [
  { suffix: "shop-items", amenityKind: "shop" },
  { suffix: "supermarket-items", amenityKind: "supermarket" },
  { suffix: "carwash-cars", amenityKind: "car_wash" },
];

function usage() {
  console.log(`backfill-owned-assets — rebuild player owned-assets sets from amenity sale state

Usage:
  node scripts/backfill-owned-assets.mjs [options]

Options:
  --url <redis-url>    Redis URL (default: REDIS_URL)
  --host-id <id>       Host id key prefix (default: AGENT_PLAY_HOST_ID or "default")
  --apply              Perform SADD writes (omit for dry-run)
  --help               Show help

Environment:
  REDIS_URL            Required unless --url is provided
  AGENT_PLAY_HOST_ID   Defaults to "default"

Examples:
  node scripts/backfill-owned-assets.mjs --url redis://127.0.0.1:6379
  node scripts/backfill-owned-assets.mjs --url redis://… --host-id default --apply
`);
}

function parseArgs(argv) {
  const flags = {
    url: process.env.REDIS_URL ?? "",
    hostId: process.env.AGENT_PLAY_HOST_ID ?? "default",
    apply: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--apply") {
      flags.apply = true;
      continue;
    }
    if (arg === "--url") {
      const next = argv[i + 1];
      if (typeof next !== "string" || next.length === 0) {
        throw new Error("--url requires a value");
      }
      flags.url = next;
      i += 1;
      continue;
    }
    if (arg === "--host-id") {
      const next = argv[i + 1];
      if (typeof next !== "string" || next.length === 0) {
        throw new Error("--host-id requires a value");
      }
      flags.hostId = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return flags;
}

function encodeOwnedAssetRef(ref) {
  return `${ref.spaceId}${SEP}${ref.amenityKind}${SEP}${ref.itemId}`;
}

function playerOwnedAssetsKey(hostId, playerId) {
  return `agent-play:${hostId}:player:${playerId}:owned-assets`;
}

function parseSpaceIdFromKey(key, hostId, suffix) {
  const prefix = `agent-play:${hostId}:space:`;
  const end = `:${suffix}`;
  if (!key.startsWith(prefix) || !key.endsWith(end)) {
    return null;
  }
  return key.slice(prefix.length, key.length - end.length);
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
      String(SCAN_COUNT)
    );
    cursor = nextCursor;
    for (const key of batch) {
      keys.push(key);
    }
  } while (cursor !== "0");
  return keys;
}

function parseOwnedSale(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const sale = parsed.sale;
  if (typeof sale !== "object" || sale === null) {
    return null;
  }
  const status = typeof sale.status === "string" ? sale.status : "";
  const soldToPlayerId =
    typeof sale.soldToPlayerId === "string" ? sale.soldToPlayerId.trim() : "";
  if (!OWNED_STATUSES.has(status) || soldToPlayerId.length === 0) {
    return null;
  }
  const itemId =
    typeof parsed.id === "string" && parsed.id.trim().length > 0
      ? parsed.id.trim()
      : null;
  return { soldToPlayerId, itemId, status };
}

async function run() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    usage();
    return;
  }
  if (typeof flags.url !== "string" || flags.url.trim().length === 0) {
    console.error("REDIS_URL (or --url) is required");
    process.exitCode = 1;
    usage();
    return;
  }

  const hostId = flags.hostId.trim();
  if (hostId.length === 0) {
    console.error("host id must be non-empty");
    process.exitCode = 1;
    return;
  }

  const redis = new Redis(flags.url);
  const mode = flags.apply ? "apply" : "dry-run";
  console.log(
    `backfill-owned-assets mode=${mode} hostId=${hostId} url=${flags.url}`
  );

  let hashesScanned = 0;
  let itemsScanned = 0;
  let ownedCandidates = 0;
  let wouldAdd = 0;
  let added = 0;
  let alreadyPresent = 0;
  let skippedUnparseable = 0;
  let skippedNoId = 0;
  const ownersTouched = new Set();
  const sampleAdds = [];

  try {
    for (const { suffix, amenityKind } of AMENITY_SUFFIXES) {
      const pattern = `agent-play:${hostId}:space:*:${suffix}`;
      const keys = await scanKeys(redis, pattern);
      for (const key of keys) {
        hashesScanned += 1;
        const spaceId = parseSpaceIdFromKey(key, hostId, suffix);
        if (spaceId === null || spaceId.length === 0) {
          skippedUnparseable += 1;
          continue;
        }
        const fields = await redis.hgetall(key);
        for (const [field, raw] of Object.entries(fields)) {
          itemsScanned += 1;
          const sale = parseOwnedSale(raw);
          if (sale === null) {
            continue;
          }
          ownedCandidates += 1;
          const itemId = sale.itemId ?? field;
          if (typeof itemId !== "string" || itemId.trim().length === 0) {
            skippedNoId += 1;
            continue;
          }
          const ref = encodeOwnedAssetRef({
            spaceId,
            amenityKind,
            itemId: itemId.trim(),
          });
          const ownedKey = playerOwnedAssetsKey(hostId, sale.soldToPlayerId);
          const isMember = await redis.sismember(ownedKey, ref);
          if (isMember === 1) {
            alreadyPresent += 1;
            continue;
          }
          ownersTouched.add(sale.soldToPlayerId);
          wouldAdd += 1;
          if (sampleAdds.length < 20) {
            sampleAdds.push({
              playerId: sale.soldToPlayerId,
              amenityKind,
              spaceId,
              itemId: itemId.trim(),
              status: sale.status,
            });
          }
          if (flags.apply) {
            const n = await redis.sadd(ownedKey, ref);
            if (n === 1) {
              added += 1;
            } else {
              alreadyPresent += 1;
              wouldAdd -= 1;
            }
          }
        }
      }
    }
  } finally {
    await redis.quit();
  }

  console.log(`hashes_scanned=${String(hashesScanned)}`);
  console.log(`items_scanned=${String(itemsScanned)}`);
  console.log(`owned_candidates=${String(ownedCandidates)}`);
  console.log(`owners_touched=${String(ownersTouched.size)}`);
  console.log(`already_present=${String(alreadyPresent)}`);
  console.log(`would_add=${String(wouldAdd)}`);
  if (flags.apply) {
    console.log(`added=${String(added)}`);
  }
  console.log(`skipped_unparseable=${String(skippedUnparseable)}`);
  console.log(`skipped_no_id=${String(skippedNoId)}`);
  if (sampleAdds.length > 0) {
    console.log("sample_missing_refs:");
    for (const row of sampleAdds) {
      console.log(
        `  player=${row.playerId} ${row.amenityKind} space=${row.spaceId} item=${row.itemId} status=${row.status}`
      );
    }
  }
  if (!flags.apply && wouldAdd > 0) {
    console.log("dry-run complete; re-run with --apply to write SADD updates");
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
