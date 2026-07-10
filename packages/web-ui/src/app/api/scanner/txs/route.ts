import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { listScannerTxs } from "@/server/scanner/scanner-payload";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET scanner/txs", req, {});
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const tokenParam = req.nextUrl.searchParams.get("token");
  const token =
    tokenParam === "APU" || tokenParam === "USD" ? tokenParam : undefined;
  const sinceMsParam = req.nextUrl.searchParams.get("sinceMs");
  const sinceMs =
    sinceMsParam !== null && sinceMsParam.length > 0
      ? Number(sinceMsParam)
      : undefined;
  if (sinceMsParam !== null && sinceMsParam.length > 0 && !Number.isFinite(sinceMs)) {
    return Response.json({ error: "Invalid sinceMs" }, { status: 400 });
  }
  const page = await listScannerTxs({
    redis,
    hostId,
    limit: Number.isFinite(limit) ? limit : 25,
    cursor,
    sinceMs,
    token,
  });
  return Response.json(page);
}
