import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import {
  buildScannerNodeProfile,
  listScannerNodeTxs,
  nodeProfileExists,
} from "@/server/scanner/scanner-node-profile";
import {
  matchesIfNoneMatch,
  notModifiedResponse,
  withScannerCacheHeaders,
} from "@/server/scanner/scanner-http-cache";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  logAgentPlayApi("GET scanner/nodes/:id", req, { id });
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const section = req.nextUrl.searchParams.get("section");
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const pageParam = req.nextUrl.searchParams.get("page");
  const txPage =
    pageParam !== null && pageParam.length > 0 && Number.isFinite(Number(pageParam))
      ? Number(pageParam)
      : undefined;

  if (section === "txs") {
    const exists = await nodeProfileExists({
      redis,
      hostId,
      nodeId: id,
    });
    if (!exists) {
      return Response.json({ error: "Node not found" }, { status: 404 });
    }
    const txPageResult = await listScannerNodeTxs({
      redis,
      hostId,
      nodeId: id,
      limit: Number.isFinite(limit) ? limit : 25,
      cursor,
      page: txPage,
    });
    return Response.json({
      txs: txPageResult.txs,
      nextCursor: txPageResult.nextCursor,
      page: txPageResult.page,
      pageSize: txPageResult.pageSize,
      total: txPageResult.total,
      pageCount: txPageResult.pageCount,
    });
  }

  if (section === "events") {
    const profile = await buildScannerNodeProfile({
      redis,
      hostId,
      nodeId: id,
      txLimit: 0,
      eventLimit: Number.isFinite(limit) ? limit : 25,
      eventCursor: cursor,
    });
    if (profile === null) {
      return Response.json({ error: "Node not found" }, { status: 404 });
    }
    return Response.json({
      events: profile.analyticsEvents,
      nextCursor: profile.analyticsEventsNextCursor,
    });
  }

  const profile = await buildScannerNodeProfile({
    redis,
    hostId,
    nodeId: id,
    txLimit: Number.isFinite(limit) ? limit : 25,
  });
  if (profile === null) {
    return Response.json({ error: "Node not found" }, { status: 404 });
  }

  const etagValue = `"node-profile:${profile.nodeId}:${profile.ledger.lastTxAt ?? "none"}"`;
  if (matchesIfNoneMatch(req.headers.get("if-none-match"), etagValue)) {
    return notModifiedResponse(etagValue);
  }

  return withScannerCacheHeaders(Response.json({ profile }), {
    etag: etagValue,
    maxAgeSeconds: 10,
  });
}
