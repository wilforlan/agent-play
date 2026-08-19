import { NextRequest } from "next/server";
import {
  parseRegisterOrganizationBody,
  registerOrganization,
} from "@/server/agent-play/register-organization";
import { getRepository, getSharedRedisClient } from "@/server/get-world";

const resolveServerUrl = (req: NextRequest): string => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ?? "";
  if (fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return req.nextUrl.origin;
};

export async function POST(req: NextRequest) {
  const redis = getSharedRedisClient();
  const repository = await getRepository().catch(() => null);
  if (redis === null || repository === null) {
    return Response.json(
      { error: "organization registry unavailable" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = parseRegisterOrganizationBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await registerOrganization({
      repository,
      redis: {
        hset: (key, fields) => redis.hset(key, fields),
        hgetall: (key) => redis.hgetall(key),
        sadd: (key, member) => redis.sadd(key, member),
      },
      hostId: process.env.AGENT_PLAY_HOST_ID?.trim() || "default",
      serverUrl: resolveServerUrl(req),
      input: parsed.input,
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("already exists") ? 409 : 400;
    return Response.json({ error: msg }, { status });
  }
}
