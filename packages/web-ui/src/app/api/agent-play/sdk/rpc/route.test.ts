import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("POST /api/agent-play/sdk/rpc", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("fanouts world chat publish to world:intercom and does not persist interaction", async () => {
    const world = {
      recordInteraction: vi.fn(async () => null),
    };
    const store = {
      getSnapshotRev: vi.fn(async () => 41),
      appendWorldChatMessage: vi.fn(async () => ({
        message: {
          seq: 7,
          requestId: "room-1",
          mainNodeId: "main-1",
          fromPlayerId: "main-1",
          message: "hello room",
          ts: "2026-04-13T09:00:00.000Z",
        },
        totalCount: 1212,
      })),
      listWorldChatMessages: vi.fn(async () => ({
        messages: [],
        hasMore: false,
        totalCount: 0,
      })),
      publishWorldFanout: vi.fn(async () => {}),
    };
    getPlayWorld.mockResolvedValue(world);
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "worldChatPublish",
          payload: {
            requestId: "room-1",
            mainNodeId: "main-1",
            fromPlayerId: "main-1",
            message: "hello room",
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(store.publishWorldFanout).toHaveBeenCalledTimes(1);
    expect(store.publishWorldFanout).toHaveBeenCalledWith(
      expect.any(Number),
      "world:intercom",
      expect.objectContaining({
        requestId: "room-1",
        mainNodeId: "main-1",
        fromPlayerId: "main-1",
        toPlayerId: "__world__",
        kind: "chat",
        status: "completed",
        channelKey: "intercom:world:global",
        message: "hello room",
        result: expect.objectContaining({
          seq: 7,
          totalCount: 1212,
          messageKind: "text",
        }),
      })
    );
    expect(world.recordInteraction).not.toHaveBeenCalled();
  });

  it("returns world chat history page", async () => {
    const world = {
      recordInteraction: vi.fn(async () => null),
    };
    const store = {
      getSnapshotRev: vi.fn(async () => 41),
      appendWorldChatMessage: vi.fn(),
      listWorldChatMessages: vi.fn(async () => ({
        messages: [
          {
            seq: 201,
            requestId: "r-201",
            mainNodeId: "main-2",
            fromPlayerId: "main-2",
            message: "older",
            ts: "2026-04-13T09:00:00.000Z",
          },
        ],
        hasMore: true,
        totalCount: 4020,
      })),
      publishWorldFanout: vi.fn(async () => {}),
    };
    getPlayWorld.mockResolvedValue(world);
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "worldChatHistory",
          payload: { limit: 100, beforeSeq: 300 },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      messages: Array<{ seq: number }>;
      hasMore: boolean;
      totalCount: number;
    };
    expect(store.listWorldChatMessages).toHaveBeenCalledWith({
      limit: 100,
      beforeSeq: 300,
    });
    expect(body.messages[0]?.seq).toBe(201);
    expect(body.hasMore).toBe(true);
    expect(body.totalCount).toBe(4020);
  });

  it("normalizes intercomResponse payload into existing world:intercom event", async () => {
    const world = {
      recordInteraction: vi.fn(async () => null),
    };
    const store = {
      getSnapshotRev: vi.fn(async () => 41),
      appendWorldChatMessage: vi.fn(),
      listWorldChatMessages: vi.fn(),
      publishWorldFanout: vi.fn(async () => {}),
    };
    getPlayWorld.mockResolvedValue(world);
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "intercomResponse",
          payload: {
            requestId: "req-media",
            mainNodeId: "main-1",
            toPlayerId: "main-1",
            fromPlayerId: "agent-1",
            kind: "assist",
            status: "completed",
            ts: "2026-04-20T13:00:00.000Z",
            result: {
              media: {
                mediaType: "image",
                url: "https://example.com/x.png",
              },
            },
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(store.publishWorldFanout).toHaveBeenCalledWith(
      expect.any(Number),
      "world:intercom",
      expect.objectContaining({
        requestId: "req-media",
        status: "completed",
        result: expect.objectContaining({
          messageKind: "media",
          media: expect.objectContaining({
            mediaType: "image",
            url: "https://example.com/x.png",
          }),
        }),
      })
    );
  });
});
