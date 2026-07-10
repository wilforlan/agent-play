import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { listScannerNodes } from "@/server/scanner/scanner-nodes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/nodes", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const page = await listScannerNodes({
    redis,
    hostId,
    limit: Number.isFinite(limit) ? limit : 25,
    cursor,
  });
  return Response.json(page);
}
