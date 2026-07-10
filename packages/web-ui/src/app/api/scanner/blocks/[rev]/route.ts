import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { getScannerBlock } from "@/server/scanner/scanner-blocks";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ rev: string }> }
) {
  const { rev: revParam } = await context.params;
  logAgentPlayApi("GET scanner/blocks/[rev]", req, { rev: revParam });
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const rev = Number(revParam);
  if (!Number.isFinite(rev)) {
    return Response.json({ error: "Invalid rev" }, { status: 400 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const block = await getScannerBlock({ redis, hostId, rev });
  if (block === null) {
    return Response.json({ error: "Block not found" }, { status: 404 });
  }
  return Response.json({ block });
}
