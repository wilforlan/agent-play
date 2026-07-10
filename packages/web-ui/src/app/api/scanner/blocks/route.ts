import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { getScannerBlock, listScannerBlocks } from "@/server/scanner/scanner-blocks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/blocks", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const revParam = req.nextUrl.searchParams.get("rev");
  if (revParam !== null && revParam.length > 0) {
    const rev = Number(revParam);
    if (!Number.isFinite(rev)) {
      return Response.json({ error: "Invalid rev" }, { status: 400 });
    }
    const block = await getScannerBlock({ redis, hostId, rev });
    if (block === null) {
      return Response.json({ error: "Block not found" }, { status: 404 });
    }
    return Response.json({ block });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const sinceRevParam = req.nextUrl.searchParams.get("sinceRev");
  const sinceRev =
    sinceRevParam !== null && sinceRevParam.length > 0
      ? Number(sinceRevParam)
      : undefined;
  if (
    sinceRevParam !== null &&
    sinceRevParam.length > 0 &&
    !Number.isFinite(sinceRev)
  ) {
    return Response.json({ error: "Invalid sinceRev" }, { status: 400 });
  }
  const page = await listScannerBlocks({
    redis,
    hostId,
    limit: Number.isFinite(limit) ? limit : 25,
    cursor,
    sinceRev,
  });
  return Response.json(page);
}
