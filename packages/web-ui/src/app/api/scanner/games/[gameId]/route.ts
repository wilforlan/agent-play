import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import {
  buildScannerGameStats,
  buildScannerTalkSummary,
} from "@/server/scanner/scanner-economy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;
  logAgentPlayApi("GET scanner/games/:gameId", req, { gameId });
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const stats = await buildScannerGameStats({
    redis,
    hostId,
    gameId: decodeURIComponent(gameId),
  });
  return Response.json(stats);
}
