import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { getScannerLeaf } from "@/server/scanner/scanner-blocks";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ stableKey: string }> }
) {
  const { stableKey } = await context.params;
  logAgentPlayApi("GET scanner/leaves/:stableKey", req, { stableKey });
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const leaf = await getScannerLeaf({
    redis,
    hostId,
    stableKey: decodeURIComponent(stableKey),
  });
  return Response.json(leaf);
}
