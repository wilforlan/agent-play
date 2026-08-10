import { NextRequest } from "next/server";
import { z } from "zod";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { ensureReferralCode } from "@/server/referrals/ensure-referral-code";
import {
  REFERRAL_REWARD_APU,
  buildReferralLink,
} from "@/server/referrals/referral-domain";

export const dynamic = "force-dynamic";

const EnsureBodySchema = z.object({
  nodeId: z.string().min(8).max(128),
});

const resolvePlayWorldBaseUrl = (req: NextRequest): string => {
  const configured = process.env.NEXT_PUBLIC_PLAY_WORLD_URL?.trim();
  if (configured !== undefined && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }
  return req.nextUrl.origin;
};

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST referrals/ensure", req, {});
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

  const parsed = EnsureBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  try {
    const ensured = await ensureReferralCode({
      redis,
      hostId,
      nodeId: parsed.data.nodeId,
      now: new Date().toISOString(),
    });
    const link = buildReferralLink({
      playWorldBaseUrl: resolvePlayWorldBaseUrl(req),
      code: ensured.code,
    });
    return Response.json({
      ok: true,
      code: ensured.code,
      link,
      rewardApu: REFERRAL_REWARD_APU,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "ensure_failed",
      },
      { status: 500 },
    );
  }
}
