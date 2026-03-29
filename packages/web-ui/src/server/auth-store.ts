import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@/server/password-hash";
import { getRedis, hostId } from "@/server/redis-client";

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

function emailKey(h: string, normalized: string): string {
  return `agent-play:${h}:auth:email:${normalized}`;
}

function userKey(h: string, userId: string): string {
  return `agent-play:${h}:auth:user:${userId}`;
}

function sessionKey(h: string, token: string): string {
  return `agent-play:${h}:auth:session:${token}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function lookupEmailExists(email: string): Promise<boolean | null> {
  const redis = getRedis();
  if (redis === null) return null;
  const norm = normalizeEmail(email);
  const id = await redis.get(emailKey(hostId(), norm));
  return id !== null && id.length > 0;
}

export async function registerUser(
  email: string,
  name: string,
  password: string
): Promise<{ userId: string } | { error: string }> {
  const redis = getRedis();
  if (redis === null) {
    return { error: "redis not configured" };
  }
  const h = hostId();
  const norm = normalizeEmail(email);
  const taken = await redis.get(emailKey(h, norm));
  if (taken !== null && taken.length > 0) {
    return { error: "email already registered" };
  }
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await redis.set(emailKey(h, norm), userId);
  await redis.hset(userKey(h, userId), {
    email: norm,
    name,
    passwordHash,
    createdAt: now,
  });
  return { userId };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ userId: string } | null> {
  const redis = getRedis();
  if (redis === null) return null;
  const h = hostId();
  const norm = normalizeEmail(email);
  const userId = await redis.get(emailKey(h, norm));
  if (userId === null || userId.length === 0) return null;
  const raw = await redis.hgetall(userKey(h, userId));
  const ph = raw.passwordHash;
  if (typeof ph !== "string" || ph.length === 0) return null;
  return (await verifyPassword(password, ph)) ? { userId } : null;
}

export async function createSession(userId: string): Promise<string | null> {
  const redis = getRedis();
  if (redis === null) return null;
  const h = hostId();
  const token = randomBytes(32).toString("hex");
  await redis.setex(sessionKey(h, token), SESSION_TTL_SEC, userId);
  return token;
}

export async function getUserIdForSession(token: string): Promise<string | null> {
  const redis = getRedis();
  if (redis === null) return null;
  const h = hostId();
  const id = await redis.get(sessionKey(h, token));
  if (id === null || id.length === 0) return null;
  return id;
}

export async function getUserProfile(
  userId: string
): Promise<{ email: string; name: string } | null> {
  const redis = getRedis();
  if (redis === null) return null;
  const h = hostId();
  const raw = await redis.hgetall(userKey(h, userId));
  const email = raw.email;
  const name = raw.name;
  if (typeof email !== "string" || typeof name !== "string") return null;
  return { email, name };
}
