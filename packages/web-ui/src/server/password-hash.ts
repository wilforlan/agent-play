import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number }
) => Promise<Buffer>;

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, 64, SCRYPT_OPTS);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const wantHex = parts[2];
  const derived = await scryptAsync(plain, salt, Buffer.from(wantHex, "hex").length, SCRYPT_OPTS);
  const gotHex = derived.toString("hex");
  if (wantHex.length !== gotHex.length) return false;
  return timingSafeEqual(Buffer.from(wantHex, "hex"), Buffer.from(gotHex, "hex"));
}
