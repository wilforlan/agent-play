import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const {
  getPlayWorld,
  getSessionStore,
  getRepository,
  validateAgentPlaySession,
} = vi.hoisted(() => ({
  getPlayWorld: vi.fn(),
  getSessionStore: vi.fn(),
  getRepository: vi.fn(),
  validateAgentPlaySession: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getPlayWorld,
  getSessionStore,
  getRepository,
}));

vi.mock("@/server/agent-play/session-validation", () => ({
  validateAgentPlaySession,
}));

import { POST } from "./route.js";
import { AGENT_SERVICE_PLATFORM_KEY_HEADER } from "@/server/agent-play/agent-service-platform-key.js";

function buildSpaceNodeRepoMock() {
  return {
    verifyNodePasswHash: vi.fn(async () => true),
    getNode: vi.fn(async () => ({
      kind: "space",
      spaceId: "space-1",
    })),
  };
}

function buildWorldMock(amenities: Array<"shop" | "supermarket" | "car_wash">) {
  return {
    getSnapshotJson: vi.fn(async () => ({
      sid: "s1",
      worldMap: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, occupants: [] },
      worldLayout: {
        rev: 1,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        zones: [],
        streets: [],
      },
      spaces: [
        {
          id: "space-1",
          name: "Test space",
          description: "",
          designKey: "shop-v1",
          owner: { displayName: "owner" },
          amenities,
        },
      ],
    })),
  };
}

function buildStoreMock() {
  return {
    getSessionId: vi.fn(() => "s1"),
    upsertShopItem: vi.fn(async () => undefined),
    upsertSupermarketItem: vi.fn(async () => undefined),
    upsertCarWashCar: vi.fn(async () => undefined),
    listSupermarketItems: vi.fn(async () => []),
    listCarWashCars: vi.fn(async () => []),
    appendSpaceAmenityLog: vi.fn(async () => undefined),
    executePurchase: vi.fn(),
    publishWorldFanout: vi.fn(async () => undefined),
    persistSnapshotReturningRev: vi.fn(async () => ({
      rev: 2,
      merkleRootHex: "deadbeef",
      merkleLeafCount: 1,
    })),
  };
}

describe("POST /api/agent-play/sdk/rpc — AGENT_SERVICE_KEY gate", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 for addShopItem when AGENT_SERVICE_KEY is set but header missing", async () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "platform-key-16chars");
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    getSessionStore.mockReturnValue(buildStoreMock());
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "n",
          "x-node-passw": "p",
        },
        body: JSON.stringify({
          op: "addShopItem",
          payload: {
            spaceId: "space-1",
            type: "book",
            name: "Test Book",
            description: "Great",
            priceUsd: 9.99,
          },
        }),
      })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_agent_service_key");
  });

  it("allows addShopItem when header matches AGENT_SERVICE_KEY", async () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "platform-key-16chars");
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const store = buildStoreMock();
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "n",
          "x-node-passw": "p",
          [AGENT_SERVICE_PLATFORM_KEY_HEADER]: "platform-key-16chars",
        },
        body: JSON.stringify({
          op: "addShopItem",
          payload: {
            spaceId: "space-1",
            type: "book",
            name: "Test Book",
            description: "Great",
            priceUsd: 9.99,
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(store.upsertShopItem).toHaveBeenCalledOnce();
  });

  it("returns 503 for removeSpaceNode when AGENT_SERVICE_KEY is unset", async () => {
    getPlayWorld.mockResolvedValue({
      removeSpaceNode: vi.fn(async () => undefined),
    });
    getSessionStore.mockReturnValue(buildStoreMock());
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "removeSpaceNode",
          payload: { nodeId: "node:space-1" },
        }),
      })
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("agent_service_key_not_configured");
  });

  it("returns 403 for removeSpaceNode when key is set but header missing", async () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "platform-key-16chars");
    getPlayWorld.mockResolvedValue({
      removeSpaceNode: vi.fn(async () => undefined),
    });
    getSessionStore.mockReturnValue(buildStoreMock());
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "removeSpaceNode",
          payload: { nodeId: "node:space-1" },
        }),
      })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_agent_service_key");
  });

  it("removeSpaceNode resolves space id and cascades when platform key matches", async () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "platform-key-16chars");
    const removeSpaceNode = vi.fn(async () => undefined);
    getPlayWorld.mockResolvedValue({ removeSpaceNode });
    getSessionStore.mockReturnValue(buildStoreMock());
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [AGENT_SERVICE_PLATFORM_KEY_HEADER]: "platform-key-16chars",
        },
        body: JSON.stringify({
          op: "removeSpaceNode",
          payload: { nodeId: "node:space-1", force: true },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; nodeId: string; spaceId: string };
    expect(body).toEqual({ ok: true, nodeId: "node:space-1", spaceId: "space-1" });
    expect(removeSpaceNode).toHaveBeenCalledWith("space-1", {
      force: true,
      ownerNodeId: "node:space-1",
    });
  });
});
