import { NextRequest } from "next/server";
import { z } from "zod";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { parseReferralCode } from "@/server/referrals/referral-domain";
import { recordReferralClick } from "@/server/referrals/attribute-referral-reward";
import { referralCodeKey } from "@/server/referrals/referral-keys";

export const dynamic = "force-dynamic";

const ClickBodySchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST referrals/click", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = ClickBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const code = parseReferralCode(parsed.data.code);
  if (code === null) {
    return Response.json({ error: "invalid code" }, { status: 400 });
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const ownerRaw = await redis.get(referralCodeKey(hostId, code));
  if (ownerRaw === null) {
    return Response.json({ ok: true, counted: false });
  }

  const count = await recordReferralClick({ redis, hostId, code });
  return Response.json({ ok: true, counted: true, count });
}
