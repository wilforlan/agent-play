import { NextRequest } from "next/server";
import {
  agentPlayVerbose,
  isAgentPlayVerboseEnabled,
} from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import type { Journey } from "@/server/agent-play/@types/world";
import { readResolvedSnapshot } from "@/server/agent-play/read-resolved-snapshot";
import { readPlayerChainNode } from "@/server/agent-play/read-player-chain-node";
import { getPlayWorld, getSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import { handleIntercomCommand } from "@/server/agent-play/intercom/intercom-router";
import { handleIntercomResponse } from "@/server/agent-play/intercom/handle-intercom-response";
import {
  CREATE_HUMAN_NODE_OP,
  INTERCOM_COMMAND_OP,
  INTERCOM_RESPONSE_OP,
  parseCreateHumanNodePayload,
  parseWorldChatHistoryPayload,
  parseWorldChatPublishPayload,
  normalizeIntercomResult,
  WORLD_CHAT_HISTORY_OP,
  WORLD_CHAT_PUBLISH_OP,
} from "@/server/agent-play/intercom/shared-intercom";
import { createNodeAccount } from "@/server/agent-play/create-node-account";
import { getRepository } from "@/server/get-world";
import { publishWorldIntercomEvent } from "@/server/agent-play/intercom/fanout";
import { isSpaceAmenityKind } from "@/server/agent-play/space-amenity";

function requireSid(req: NextRequest): string | null {
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) return null;
  return raw.trim();
}

async function verifyMainNodeHeaders(req: NextRequest): Promise<Response | null> {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json({ error: "repository unavailable" }, { status: 503 });
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "missing x-node-id / x-node-passw" }, { status: 401 });
  }
  if (!(await repository.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const row = await repository.getNode(nodeId);
  if (row === null || row.kind !== "main") {
    return Response.json({ error: "main node required" }, { status: 403 });
  }
  return null;
}

async function verifySpaceNodeHeaders(
  req: NextRequest,
  expectedSpaceId: string
): Promise<Response | null> {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json({ error: "repository unavailable" }, { status: 503 });
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passw = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passw.length === 0) {
    return Response.json({ error: "missing x-node-id / x-node-passw" }, { status: 401 });
  }
  if (!(await repository.verifyNodePassw(nodeId, passw))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const row = await repository.getNode(nodeId);
  if (row === null || row.kind !== "space") {
    return Response.json({ error: "space node required" }, { status: 403 });
  }
  const want = expectedSpaceId.trim();
  if (row.spaceId !== want) {
    return Response.json({ error: "space scope mismatch" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST sdk/rpc", req);
  let body: { op?: unknown; payload?: unknown };
  try {
    body = (await req.json()) as { op?: unknown; payload?: unknown };
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.op !== "string") {
    return Response.json({ error: "missing op" }, { status: 400 });
  }
  agentPlayVerbose("api", "sdk/rpc op", { op: body.op });

  const world = await getPlayWorld();
  const store = getSessionStore();

  try {
    if (body.op === "getWorldSnapshot") {
      const snap = await readResolvedSnapshot({
        sid: store.getSessionId(),
        store,
      });
      if (isAgentPlayVerboseEnabled()) {
        agentPlayVerbose("api", "getWorldSnapshot", snap);
      }
      return Response.json({ snapshot: snap });
    }

    // Incremental sync: one player-chain node from the live snapshot (see read-player-chain-node).
    if (body.op === "getPlayerChainNode") {
      const p = body.payload as { stableKey?: unknown };
      if (typeof p.stableKey !== "string" || p.stableKey.trim().length === 0) {
        return Response.json({ error: "invalid payload" }, { status: 400 });
      }
      const node = await readPlayerChainNode({
        sid: store.getSessionId(),
        store,
        stableKey: p.stableKey.trim(),
      });
      if (node === null) {
        return Response.json({ error: "unknown stableKey" }, { status: 400 });
      }
      return Response.json({ node });
    }

    const sid = requireSid(req);
    if (sid === null) {
      agentPlayVerbose("api", "sdk/rpc rejected", { reason: "missing sid" });
      return Response.json({ error: "missing sid" }, { status: 400 });
    }
    if (!(await validateAgentPlaySession(sid))) {
      agentPlayVerbose("api", "sdk/rpc rejected", { reason: "invalid sid" });
      return Response.json({ error: "invalid sid" }, { status: 403 });
    }

    switch (body.op) {
      case CREATE_HUMAN_NODE_OP: {
        const p = parseCreateHumanNodePayload(body.payload);
        const repository = await getRepository();
        if (repository === null) {
          return Response.json({ error: "repository unavailable" }, { status: 503 });
        }
        const { nodeId } = await createNodeAccount(repository, {
          kind: "main",
          passw: p.passw,
        });
        return Response.json({ ok: true, nodeId });
      }
      case INTERCOM_COMMAND_OP: {
        await handleIntercomCommand({
          store,
          world,
          payload: body.payload,
        });
        return Response.json({ ok: true });
      }
      case INTERCOM_RESPONSE_OP: {
        await handleIntercomResponse({
          store,
          payload: body.payload,
        });
        return Response.json({ ok: true });
      }
      case WORLD_CHAT_PUBLISH_OP: {
        const p = parseWorldChatPublishPayload(body.payload);
        const appended = await store.appendWorldChatMessage({
          requestId: p.requestId,
          mainNodeId: p.mainNodeId,
          fromPlayerId: p.fromPlayerId,
          message: p.message,
          ts: new Date().toISOString(),
        });
        await publishWorldIntercomEvent({
          store,
          payload: {
            requestId: appended.message.requestId,
            mainNodeId: appended.message.mainNodeId,
            toPlayerId: "__world__",
            fromPlayerId: appended.message.fromPlayerId,
            kind: "chat",
            status: "completed",
            message: appended.message.message,
            result: normalizeIntercomResult({
              message: appended.message.message,
              result: {
                seq: appended.message.seq,
                totalCount: appended.totalCount,
              },
            }),
            channelKey: "intercom:world:global",
            ts: appended.message.ts,
          },
        });
        return Response.json({ ok: true });
      }
      case WORLD_CHAT_HISTORY_OP: {
        const p = parseWorldChatHistoryPayload(body.payload);
        const page = await store.listWorldChatMessages({
          limit: p.limit,
          beforeSeq: p.beforeSeq,
        });
        return Response.json({
          messages: page.messages,
          hasMore: page.hasMore,
          totalCount: page.totalCount,
        });
      }
      case "recordInteraction": {
        const p = body.payload as {
          playerId?: unknown;
          role?: unknown;
          text?: unknown;
        };
        if (
          typeof p.playerId !== "string" ||
          typeof p.role !== "string" ||
          typeof p.text !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const riPlayerId = p.playerId;
        const riRole = p.role as "user" | "assistant" | "tool";
        const riText = p.text;
        if (riText.trim().length === 0) {
          return Response.json({ ok: true });
        }
        await world.recordInteraction({
          playerId: riPlayerId,
          role: riRole,
          text: riText,
        });
        return Response.json({ ok: true });
      }
      case "recordJourney": {
        const p = body.payload as {
          playerId?: unknown;
          journey?: unknown;
        };
        if (typeof p.playerId !== "string" || p.journey === undefined) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const rjPlayerId = p.playerId;
        const rjJourney = p.journey as Journey;
        await world.recordJourney(rjPlayerId, rjJourney);
        return Response.json({ ok: true });
      }
      case "createSpace": {
        const gate = await verifyMainNodeHeaders(req);
        if (gate !== null) {
          return gate;
        }
        const p = body.payload as {
          name?: unknown;
          designKey?: unknown;
          ownerDisplayName?: unknown;
          description?: unknown;
          structureName?: unknown;
        };
        if (
          typeof p.name !== "string" ||
          typeof p.designKey !== "string" ||
          typeof p.ownerDisplayName !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const created = await world.createSpaceWithNode({
          name: p.name.trim(),
          designKey: p.designKey.trim(),
          ownerDisplayName: p.ownerDisplayName.trim(),
          ...(typeof p.description === "string"
            ? { description: p.description }
            : {}),
          ...(typeof p.structureName === "string"
            ? { structureName: p.structureName }
            : {}),
        });
        return Response.json(created);
      }
      case "addSpaceAmenity": {
        const p = body.payload as { spaceId?: unknown; kind?: unknown };
        if (typeof p.spaceId !== "string" || typeof p.kind !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        if (!isSpaceAmenityKind(p.kind)) {
          return Response.json({ error: "invalid amenity kind" }, { status: 400 });
        }
        const row = await world.addSpaceAmenity(p.spaceId.trim(), p.kind);
        return Response.json({ space: row });
      }
      case "removeSpaceAmenity": {
        const p = body.payload as { spaceId?: unknown; kind?: unknown };
        if (typeof p.spaceId !== "string" || typeof p.kind !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        if (!isSpaceAmenityKind(p.kind)) {
          return Response.json({ error: "invalid amenity kind" }, { status: 400 });
        }
        const row = await world.removeSpaceAmenity(p.spaceId.trim(), p.kind);
        return Response.json({ space: row });
      }
      case "removeSpace": {
        const gate = await verifyMainNodeHeaders(req);
        if (gate !== null) {
          return gate;
        }
        const p = body.payload as { spaceId?: unknown; force?: unknown };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        await world.removeSpaceNode(p.spaceId.trim(), {
          force: p.force === true,
        });
        return Response.json({ ok: true });
      }
      case "inspectSpace": {
        const p = body.payload as { spaceId?: unknown };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        const detail = await world.getSpaceDetail(p.spaceId.trim());
        return Response.json(detail);
      }
      case "inspectAmenity": {
        const p = body.payload as { spaceId?: unknown; kind?: unknown };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        const kind =
          typeof p.kind === "string" && isSpaceAmenityKind(p.kind)
            ? p.kind
            : undefined;
        const logs = await store.listSpaceAmenityLogs({
          spaceId: p.spaceId.trim(),
          ...(kind !== undefined ? { amenityKind: kind } : {}),
          limit: 200,
        });
        const leases = (await store.listSpaceLeases(p.spaceId.trim())).filter(
          (l) => kind === undefined || l.amenityKind === kind
        );
        return Response.json({ logs, leases });
      }
      case "createAmenityLease": {
        const p = body.payload as {
          spaceId?: unknown;
          amenityKind?: unknown;
          tenantEmail?: unknown;
          tenantAddress?: unknown;
          humanPlayerId?: unknown;
          durationMonths?: unknown;
        };
        if (
          typeof p.spaceId !== "string" ||
          typeof p.amenityKind !== "string" ||
          typeof p.tenantEmail !== "string" ||
          typeof p.tenantAddress !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        if (!isSpaceAmenityKind(p.amenityKind)) {
          return Response.json({ error: "invalid amenity kind" }, { status: 400 });
        }
        const dmRaw = p.durationMonths;
        const durationMonths =
          typeof dmRaw === "number"
            ? dmRaw
            : typeof dmRaw === "string"
              ? Number.parseInt(dmRaw, 10)
              : NaN;
        if (
          !Number.isFinite(durationMonths) ||
          durationMonths < 1 ||
          durationMonths > 240 ||
          !Number.isInteger(durationMonths)
        ) {
          return Response.json(
            { error: "durationMonths must be an integer from 1 to 240" },
            { status: 400 }
          );
        }
        const lease = await world.createAmenityLease({
          spaceId: p.spaceId.trim(),
          amenityKind: p.amenityKind,
          tenantEmail: p.tenantEmail,
          tenantAddress: p.tenantAddress,
          durationMonths,
          ...(typeof p.humanPlayerId === "string"
            ? { humanPlayerId: p.humanPlayerId }
            : {}),
        });
        return Response.json({ lease });
      }
      case "cancelAmenityLease": {
        const p = body.payload as { spaceId?: unknown; leaseId?: unknown };
        if (typeof p.spaceId !== "string" || typeof p.leaseId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) {
          return gate;
        }
        await world.cancelAmenityLease({
          spaceId: p.spaceId.trim(),
          leaseId: p.leaseId.trim(),
        });
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "unknown op" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "sdk/rpc catch", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
