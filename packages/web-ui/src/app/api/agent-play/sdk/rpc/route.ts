/**
 * @packageDocumentation
 * @module @agent-play/web-ui/api/sdk/rpc/route
 *
 * Server entry point for the SDK RPC surface used by the play UI and the
 * AQL playground. Each operation in {@link RpcRequest.op} maps to one handler
 * below; all handlers go through {@link ./session-store.ts | the session
 * store} for persistence and fan out updates via the player chain.
 *
 * **Added in 3.1.1**:
 * - `addShopItem`, `addSupermarketItem`, `addCarWashCar` (+ matching
 *   `remove*`), insert with `sale.status = 'available'`.
 * - `enterSpace`, `enterAmenity`: audit-log only; persistence is driven by
 *   the snapshot.
 * - `purchase`: `WATCH`/`MULTI`-protected single transaction that decrements
 *   the wallet and flips the item to `sale = { status: 'sold', ... }`. Returns
 *   structured `ITEM_ALREADY_SOLD` / `INSUFFICIENT_FUNDS` errors.
 *
 * **Added in 3.1.2**:
 * - `inspectAmenity` now also returns `items`. When `kind` is provided
 *   the response is `{ kind, items: <array>, logs, leases }`; otherwise
 *   `items` is `{ shopItems, supermarketItems, carWashCars }`.
 * - `removeAmenityItems` — bulk delete for amenity content. Pass
 *   `{ spaceId, kind, all: true }` to wipe a kind, or
 *   `{ spaceId, kind, itemIds: [...] }` to delete a specific subset.
 *
 * @see ../../../../../sdk/src/lib/space-content-model.ts for the schemas
 *      enforced here.
 * @see ../../../../../play-ui/src/purchase-client.ts for the browser client.
 */
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import {
  CarWashCarSchema,
  ShopItemSchema,
  SupermarketItemSchema,
  type CarWashCar,
  type ShopItem,
  type SupermarketItem,
} from "@agent-play/sdk";
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
  SPACE_AMENITY_CONTENT_UPDATED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_FANOUT_PLAYER_ID,
} from "@/server/agent-play/play-transport";
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
  const passwHash = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passwHash.length === 0) {
    return Response.json({ error: "missing x-node-id / x-node-passw" }, { status: 401 });
  }
  if (!(await repository.verifyNodePasswHash({ nodeId, passwHash }))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const row = await repository.getNode(nodeId);
  if (row === null || row.kind !== "main") {
    return Response.json({ error: "main node required" }, { status: 403 });
  }
  return null;
}

async function assertSpaceHasAmenity(
  world: Awaited<ReturnType<typeof getPlayWorld>>,
  spaceId: string,
  amenityKind: "shop" | "supermarket" | "car_wash"
): Promise<Response | null> {
  const snap = await world.getSnapshotJson();
  const entry = snap.spaces?.find((s) => s.id === spaceId);
  if (entry === undefined) {
    return Response.json({ error: "unknown space" }, { status: 404 });
  }
  if (!entry.amenities.includes(amenityKind)) {
    return Response.json(
      { error: "AMENITY_NOT_ON_SPACE" },
      { status: 400 }
    );
  }
  return null;
}

async function fanoutAmenityContentUpdated(input: {
  store: ReturnType<typeof getSessionStore>;
  world: Awaited<ReturnType<typeof getPlayWorld>>;
  spaceId: string;
  amenityKind: "shop" | "supermarket" | "car_wash";
  reason: "added" | "removed" | "sold";
  itemRef: { kind: "shop" | "supermarket" | "carwash"; id: string };
}): Promise<void> {
  const snap = await input.world.getSnapshotJson();
  const persistRev = await input.store.persistSnapshotReturningRev(snap);
  await input.store.publishWorldFanout(
    persistRev.rev,
    SPACE_AMENITY_CONTENT_UPDATED_EVENT,
    {
      playerId: WORLD_FANOUT_PLAYER_ID,
      spaceId: input.spaceId,
      amenityKind: input.amenityKind,
      reason: input.reason,
      itemRef: input.itemRef,
    },
    {
      merkleRootHex: persistRev.merkleRootHex,
      merkleLeafCount: persistRev.merkleLeafCount,
    }
  );
  await input.store.publishWorldFanout(
    persistRev.rev,
    WORLD_AGENT_SIGNAL_EVENT,
    {
      playerId: WORLD_FANOUT_PLAYER_ID,
      kind: "metadata",
      data: { reason: "amenity_content_updated", spaceId: input.spaceId },
    }
  );
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
  const passwHash = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passwHash.length === 0) {
    return Response.json({ error: "missing x-node-id / x-node-passw" }, { status: 401 });
  }
  if (!(await repository.verifyNodePasswHash({ nodeId, passwHash }))) {
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
          nodeId: p.nodeId,
          passwHash: p.passwHash,
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
        const spaceId = p.spaceId.trim();
        const logs = await store.listSpaceAmenityLogs({
          spaceId,
          ...(kind !== undefined ? { amenityKind: kind } : {}),
          limit: 200,
        });
        const leases = (await store.listSpaceLeases(spaceId)).filter(
          (l) => kind === undefined || l.amenityKind === kind
        );
        let items: unknown;
        if (kind === "shop") {
          items = await store.listShopItems(spaceId);
        } else if (kind === "supermarket") {
          items = await store.listSupermarketItems(spaceId);
        } else if (kind === "car_wash") {
          items = await store.listCarWashCars(spaceId);
        } else {
          const [shopItems, supermarketItems, carWashCars] = await Promise.all([
            store.listShopItems(spaceId),
            store.listSupermarketItems(spaceId),
            store.listCarWashCars(spaceId),
          ]);
          items = { shopItems, supermarketItems, carWashCars };
        }
        return Response.json({
          ...(kind !== undefined ? { kind } : {}),
          items,
          logs,
          leases,
        });
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
      case "addShopItem": {
        const p = body.payload as {
          spaceId?: unknown;
          type?: unknown;
          name?: unknown;
          description?: unknown;
          priceUsd?: unknown;
        };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) return gate;
        const spaceId = p.spaceId.trim();
        const amenityGate = await assertSpaceHasAmenity(world, spaceId, "shop");
        if (amenityGate !== null) return amenityGate;
        const item: ShopItem = ShopItemSchema.parse({
          id: `shop-${randomUUID()}`,
          spaceId,
          type: p.type,
          name: typeof p.name === "string" ? p.name : "",
          description: typeof p.description === "string" ? p.description : "",
          priceUsd: p.priceUsd,
          createdAt: new Date().toISOString(),
          sale: { status: "available" },
        });
        await store.upsertShopItem(item);
        await fanoutAmenityContentUpdated({
          store,
          world,
          spaceId,
          amenityKind: "shop",
          reason: "added",
          itemRef: { kind: "shop", id: item.id },
        });
        return Response.json({ item });
      }
      case "addSupermarketItem": {
        const p = body.payload as {
          spaceId?: unknown;
          name?: unknown;
          description?: unknown;
          priceUsd?: unknown;
          row?: unknown;
          column?: unknown;
        };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) return gate;
        const spaceId = p.spaceId.trim();
        const amenityGate = await assertSpaceHasAmenity(
          world,
          spaceId,
          "supermarket"
        );
        if (amenityGate !== null) return amenityGate;
        const rowRaw = Number(p.row);
        if (!Number.isInteger(rowRaw) || rowRaw < 1 || rowRaw > 4) {
          return Response.json(
            { error: "row must be an integer 1..4" },
            { status: 400 }
          );
        }
        const row = rowRaw as 1 | 2 | 3 | 4;
        let column: 1 | 2 | 3 | 4 | 5;
        if (p.column === undefined || p.column === null) {
          const existing = await store.listSupermarketItems(spaceId);
          const taken = new Set(
            existing.filter((i) => i.row === row).map((i) => i.column)
          );
          const free = [1, 2, 3, 4, 5].find((c) => !taken.has(c as 1 | 2 | 3 | 4 | 5));
          if (free === undefined) {
            return Response.json(
              { error: "no free column in this row" },
              { status: 400 }
            );
          }
          column = free as 1 | 2 | 3 | 4 | 5;
        } else {
          const c = Number(p.column);
          if (!Number.isInteger(c) || c < 1 || c > 5) {
            return Response.json(
              { error: "column must be an integer 1..5" },
              { status: 400 }
            );
          }
          column = c as 1 | 2 | 3 | 4 | 5;
        }
        const item: SupermarketItem = SupermarketItemSchema.parse({
          id: `sm-${randomUUID()}`,
          spaceId,
          row,
          column,
          name: typeof p.name === "string" ? p.name : "",
          description: typeof p.description === "string" ? p.description : "",
          priceUsd: p.priceUsd,
          createdAt: new Date().toISOString(),
          sale: { status: "available" },
        });
        await store.upsertSupermarketItem(item);
        await fanoutAmenityContentUpdated({
          store,
          world,
          spaceId,
          amenityKind: "supermarket",
          reason: "added",
          itemRef: { kind: "supermarket", id: item.id },
        });
        return Response.json({ item });
      }
      case "addCarWashCar": {
        const p = body.payload as {
          spaceId?: unknown;
          name?: unknown;
          model?: unknown;
          year?: unknown;
          priceUsd?: unknown;
          colorHex?: unknown;
          slot?: unknown;
        };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) return gate;
        const spaceId = p.spaceId.trim();
        const amenityGate = await assertSpaceHasAmenity(
          world,
          spaceId,
          "car_wash"
        );
        if (amenityGate !== null) return amenityGate;
        let slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
        if (p.slot === undefined || p.slot === null) {
          const existing = await store.listCarWashCars(spaceId);
          const taken = new Set(existing.map((c) => c.slot));
          const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(
            (s) => !taken.has(s as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)
          );
          if (free === undefined) {
            return Response.json(
              { error: "no free slot in this car wash" },
              { status: 400 }
            );
          }
          slot = free as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
        } else {
          const n = Number(p.slot);
          if (!Number.isInteger(n) || n < 1 || n > 9) {
            return Response.json(
              { error: "slot must be an integer 1..9" },
              { status: 400 }
            );
          }
          slot = n as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
        }
        const car: CarWashCar = CarWashCarSchema.parse({
          id: `car-${randomUUID()}`,
          spaceId,
          slot,
          name: typeof p.name === "string" ? p.name : "",
          model: typeof p.model === "string" ? p.model : "",
          year: Number(p.year),
          priceUsd: p.priceUsd,
          colorHex: typeof p.colorHex === "string" ? p.colorHex : "",
          createdAt: new Date().toISOString(),
          sale: { status: "available" },
        });
        await store.upsertCarWashCar(car);
        await fanoutAmenityContentUpdated({
          store,
          world,
          spaceId,
          amenityKind: "car_wash",
          reason: "added",
          itemRef: { kind: "carwash", id: car.id },
        });
        return Response.json({ item: car });
      }
      case "removeShopItem":
      case "removeSupermarketItem":
      case "removeCarWashCar": {
        const p = body.payload as { spaceId?: unknown; itemId?: unknown };
        if (typeof p.spaceId !== "string" || typeof p.itemId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) return gate;
        const spaceId = p.spaceId.trim();
        const id = p.itemId.trim();
        let ok = false;
        let amenityKind: "shop" | "supermarket" | "car_wash";
        let refKind: "shop" | "supermarket" | "carwash";
        if (body.op === "removeShopItem") {
          ok = await store.removeShopItem({ spaceId, itemId: id });
          amenityKind = "shop";
          refKind = "shop";
        } else if (body.op === "removeSupermarketItem") {
          ok = await store.removeSupermarketItem({ spaceId, itemId: id });
          amenityKind = "supermarket";
          refKind = "supermarket";
        } else {
          ok = await store.removeCarWashCar({ spaceId, carId: id });
          amenityKind = "car_wash";
          refKind = "carwash";
        }
        if (ok) {
          await fanoutAmenityContentUpdated({
            store,
            world,
            spaceId,
            amenityKind,
            reason: "removed",
            itemRef: { kind: refKind, id },
          });
        }
        return Response.json({ ok });
      }
      case "removeAmenityItems": {
        const p = body.payload as {
          spaceId?: unknown;
          kind?: unknown;
          all?: unknown;
          itemIds?: unknown;
        };
        if (typeof p.spaceId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        if (typeof p.kind !== "string" || !isSpaceAmenityKind(p.kind)) {
          return Response.json(
            { error: "invalid amenity kind" },
            { status: 400 }
          );
        }
        const gate = await verifySpaceNodeHeaders(req, p.spaceId);
        if (gate !== null) return gate;
        const spaceId = p.spaceId.trim();
        const kind = p.kind;
        const amenityGate = await assertSpaceHasAmenity(world, spaceId, kind);
        if (amenityGate !== null) return amenityGate;
        let ids: string[];
        if (p.all === true) {
          if (kind === "shop") {
            ids = (await store.listShopItems(spaceId)).map((i) => i.id);
          } else if (kind === "supermarket") {
            ids = (await store.listSupermarketItems(spaceId)).map((i) => i.id);
          } else {
            ids = (await store.listCarWashCars(spaceId)).map((c) => c.id);
          }
        } else if (Array.isArray(p.itemIds)) {
          ids = (p.itemIds as unknown[])
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter((x) => x.length > 0);
          if (ids.length === 0) {
            return Response.json(
              { error: "itemIds must be a non-empty array" },
              { status: 400 }
            );
          }
        } else {
          return Response.json(
            { error: "provide all=true or itemIds=[]" },
            { status: 400 }
          );
        }
        const refKind: "shop" | "supermarket" | "carwash" =
          kind === "car_wash" ? "carwash" : kind;
        const removed: string[] = [];
        for (const id of ids) {
          let ok = false;
          if (kind === "shop") {
            ok = await store.removeShopItem({ spaceId, itemId: id });
          } else if (kind === "supermarket") {
            ok = await store.removeSupermarketItem({ spaceId, itemId: id });
          } else {
            ok = await store.removeCarWashCar({ spaceId, carId: id });
          }
          if (ok) {
            removed.push(id);
            await fanoutAmenityContentUpdated({
              store,
              world,
              spaceId,
              amenityKind: kind,
              reason: "removed",
              itemRef: { kind: refKind, id },
            });
          }
        }
        return Response.json({ removed, requested: ids.length });
      }
      case "enterSpace": {
        const p = body.payload as {
          playerId?: unknown;
          structureId?: unknown;
          spaceId?: unknown;
        };
        if (typeof p.playerId !== "string" || typeof p.structureId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const transition = await world.enterStructureSpace({
          playerId: p.playerId,
          structureId: p.structureId,
          ...(typeof p.spaceId === "string" ? { spaceId: p.spaceId } : {}),
        });
        return Response.json({ transition });
      }
      case "enterAmenity": {
        const p = body.payload as {
          playerId?: unknown;
          spaceId?: unknown;
          amenityKind?: unknown;
        };
        if (
          typeof p.playerId !== "string" ||
          typeof p.spaceId !== "string" ||
          typeof p.amenityKind !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        if (!isSpaceAmenityKind(p.amenityKind)) {
          return Response.json({ error: "invalid amenity kind" }, { status: 400 });
        }
        await store.appendSpaceAmenityLog({
          spaceId: p.spaceId,
          amenityKind: p.amenityKind,
          entry: {
            at: new Date().toISOString(),
            action: "amenity_entered",
            detail: { playerId: p.playerId },
          },
        });
        return Response.json({ ok: true });
      }
      case "getPlayerWallet": {
        const p = body.payload as { playerId?: unknown };
        if (typeof p.playerId !== "string" || p.playerId.trim().length === 0) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const wallet = await store.getPlayerWallet(p.playerId.trim());
        return Response.json({ wallet });
      }
      case "listPurchases": {
        const p = body.payload as { playerId?: unknown; limit?: unknown };
        if (typeof p.playerId !== "string" || p.playerId.trim().length === 0) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const rawLimit = typeof p.limit === "number" ? p.limit : 100;
        const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 200);
        const playerId = p.playerId.trim();
        const purchases = await store.listPurchases({ playerId, limit });
        const spaceIds = Array.from(
          new Set(purchases.map((rec) => rec.spaceId))
        );
        const itemsByRef: Record<string, unknown> = {};
        for (const spaceId of spaceIds) {
          const [shopItems, supermarketItems, carWashCars] = await Promise.all([
            store.listShopItems(spaceId),
            store.listSupermarketItems(spaceId),
            store.listCarWashCars(spaceId),
          ]);
          for (const it of shopItems) {
            itemsByRef[`shop:${spaceId}:${it.id}`] = it;
          }
          for (const it of supermarketItems) {
            itemsByRef[`supermarket:${spaceId}:${it.id}`] = it;
          }
          for (const it of carWashCars) {
            itemsByRef[`carwash:${spaceId}:${it.id}`] = it;
          }
        }
        const wallet = await store.getPlayerWallet(playerId);
        return Response.json({
          wallet,
          purchases,
          items: itemsByRef,
        });
      }
      case "setPlayerWalletBalance": {
        const gate = await verifyMainNodeHeaders(req);
        if (gate !== null) return gate;
        const p = body.payload as { playerId?: unknown; balanceUsd?: unknown };
        if (typeof p.playerId !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const balance = Number(p.balanceUsd);
        if (!Number.isFinite(balance) || balance < 0) {
          return Response.json(
            { error: "balanceUsd must be a non-negative number" },
            { status: 400 }
          );
        }
        const wallet = await store.setPlayerWalletBalance({
          playerId: p.playerId.trim(),
          balanceUsd: balance,
        });
        return Response.json({ wallet });
      }
      case "purchase": {
        const p = body.payload as {
          playerId?: unknown;
          spaceId?: unknown;
          amenityKind?: unknown;
          itemRef?: { kind?: unknown; id?: unknown };
        };
        if (
          typeof p.playerId !== "string" ||
          typeof p.spaceId !== "string" ||
          typeof p.amenityKind !== "string" ||
          p.itemRef === undefined ||
          p.itemRef === null ||
          typeof p.itemRef.kind !== "string" ||
          typeof p.itemRef.id !== "string"
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const amenityKind = p.amenityKind;
        const refKind = p.itemRef.kind;
        if (
          amenityKind !== "shop" &&
          amenityKind !== "supermarket" &&
          amenityKind !== "car_wash"
        ) {
          return Response.json(
            { error: "invalid amenity kind" },
            { status: 400 }
          );
        }
        if (
          refKind !== "shop" &&
          refKind !== "supermarket" &&
          refKind !== "carwash"
        ) {
          return Response.json({ error: "invalid itemRef.kind" }, { status: 400 });
        }
        const result = await store.executePurchase({
          spaceId: p.spaceId.trim(),
          amenityKind,
          itemRef: { kind: refKind, id: p.itemRef.id.trim() },
          playerId: p.playerId.trim(),
          now: new Date().toISOString(),
          recordId: `pur-${randomUUID()}`,
        });
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 409 });
        }
        await store.appendSpaceAmenityLog({
          spaceId: p.spaceId.trim(),
          amenityKind,
          entry: {
            at: result.record.at,
            action: "purchase",
            detail: {
              playerId: result.record.playerId,
              itemRef: result.record.itemRef,
              priceUsd: result.record.priceUsd,
            },
          },
        });
        await fanoutAmenityContentUpdated({
          store,
          world,
          spaceId: p.spaceId.trim(),
          amenityKind,
          reason: "sold",
          itemRef: result.record.itemRef,
        });
        return Response.json({
          purchase: result.record,
          wallet: result.wallet,
          item: result.updatedItem,
        });
      }
      case "talkSessionStart": {
        const p = body.payload as {
          viewerNodeId?: unknown;
          agentId?: unknown;
        };
        if (
          typeof p.viewerNodeId !== "string" ||
          p.viewerNodeId.trim().length === 0 ||
          typeof p.agentId !== "string" ||
          p.agentId.trim().length === 0
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const now = new Date().toISOString();
        const out = await store.startTalkSession({
          viewerNodeId: p.viewerNodeId.trim(),
          agentId: p.agentId.trim(),
          now,
        });
        return Response.json(out);
      }
      case "talkSessionTick": {
        const p = body.payload as {
          viewerNodeId?: unknown;
          agentId?: unknown;
        };
        if (
          typeof p.viewerNodeId !== "string" ||
          p.viewerNodeId.trim().length === 0 ||
          typeof p.agentId !== "string" ||
          p.agentId.trim().length === 0
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const now = new Date().toISOString();
        const out = await store.tickTalkSession({
          viewerNodeId: p.viewerNodeId.trim(),
          agentId: p.agentId.trim(),
          now,
        });
        return Response.json(out);
      }
      case "talkSessionStop": {
        const p = body.payload as {
          viewerNodeId?: unknown;
          agentId?: unknown;
        };
        if (
          typeof p.viewerNodeId !== "string" ||
          p.viewerNodeId.trim().length === 0 ||
          typeof p.agentId !== "string" ||
          p.agentId.trim().length === 0
        ) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }
        const now = new Date().toISOString();
        const out = await store.stopTalkSession({
          viewerNodeId: p.viewerNodeId.trim(),
          agentId: p.agentId.trim(),
          now,
        });
        return Response.json(out);
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
