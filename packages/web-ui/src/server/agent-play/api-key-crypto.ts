import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number }
) => Promise<Buffer>;

const KEY_BYTES = 32;
const SALT_BYTES = 16;
const SCRYPT_N = 16384;

export function generatePlainApiKey(): string {
  return randomBytes(KEY_BYTES).toString("base64url");
}

export async function hashApiKey(plainKey: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(plainKey, salt, 64, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
  });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyApiKeyHash(
  plainKey: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1] ?? "", "base64");
  const expected = Buffer.from(parts[2] ?? "", "base64");
  const derived = await scryptAsync(plainKey, salt, expected.length, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function lookupIndexFromPlainKey(plainKey: string): string {
  return createHash("sha256").update(plainKey, "utf8").digest("hex");
}
