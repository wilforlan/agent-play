import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTERCOM_RESPONSE_OP, WORLD_INTERCOM_EVENT } from "@agent-play/intercom";
import {
  RemotePlayWorld,
  type RemotePlayWorldNodeCredentials,
} from "./remote-play-world.js";

const BASE_URL = "http://127.0.0.1:3000";
const SESSION_URL = `${BASE_URL}/api/agent-play/session`;
const DEFAULT_NODE_ID = "n1";

const intercomSseMessages = vi.hoisted(() => ({
  items: [] as Array<{ event?: string; data: string }>,
}));

vi.mock("eventsource-client", () => ({
  createEventSource: () => ({
    close: () => {},
    async *[Symbol.asyncIterator]() {
      for (const m of intercomSseMessages.items) {
        yield m;
      }
    },
  }),
}));

function nodeCredentialsFromHumanPhrase(human: string): RemotePlayWorldNodeCredentials {
  return {
    rootKey: DEFAULT_NODE_ID,
    passw: human,
  };
}

function playWorld(humanPassphrase: string = "k"): RemotePlayWorld {
  return new RemotePlayWorld({
    baseUrl: BASE_URL,
    nodeCredentials: nodeCredentialsFromHumanPhrase(humanPassphrase),
  });
}

function sessionResponse(): Response {
  return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
}

describe("subscribeIntercomCommands", () => {
  beforeEach(() => {
    intercomSseMessages.items = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ignores non-intercom SSE events without invoking executeTool", async () => {
    intercomSseMessages.items = [
      {
        event: "world:interaction",
        data: JSON.stringify({
          playerId: "p1",
          role: "user",
          text: "hello",
          at: "2026-01-01T00:00:00.000Z",
          seq: 0,
        }),
      },
    ];
    const executeTool = vi.fn(() => ({}));
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    world.subscribeIntercomCommands({
      playerIds: ["agent-a", "agent-b"],
      executeTool,
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(executeTool).not.toHaveBeenCalled();
    await world.close();
  });

  it("handles world:intercom forwarded once for matching playerIds", async () => {
    const agentId = "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d";
    const mainNodeId = "75c4aeb12681a2526c0e4cacbe8c7d45afeab99d2d09d07d68ed8b8e5b6d3dc3";
    const forwardedEnvelope = {
      requestId: "d4c6888d-188f-4972-b812-600d8c47fd90",
      mainNodeId,
      toPlayerId: mainNodeId,
      fromPlayerId: agentId,
      kind: "chat" as const,
      status: "forwarded" as const,
      channelKey: `intercom:human:${mainNodeId}:agent:${agentId}`,
      command: {
        requestId: "d4c6888d-188f-4972-b812-600d8c47fd90",
        mainNodeId,
        fromPlayerId: mainNodeId,
        toPlayerId: agentId,
        kind: "chat" as const,
        text: "hello",
      },
      ts: "2026-04-10T20:57:07.622Z",
    };
    intercomSseMessages.items = [
      {
        event: WORLD_INTERCOM_EVENT,
        data: JSON.stringify(forwardedEnvelope),
      },
    ];
    const executeTool = vi.fn(
      (input: { toolName: string; args: Record<string, unknown> }) => ({
        mode: "chat",
        message: "hello",
        toolName: input.toolName,
      })
    );
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    world.subscribeIntercomCommands({
      playerIds: [agentId, "4fda036ff28e27a1df7529ebd765bc23dec4228b1e9be3fff4cea57bbc9b8dc4"],
      executeTool,
    });
    await vi.waitFor(() => {
      expect(executeTool).toHaveBeenCalledTimes(1);
    });
    const firstCall = executeTool.mock.calls.at(0);
    expect(firstCall?.[0]).toEqual({
      toolName: "chat_tool",
      args: { text: "hello" },
    });
    const rpcCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/sdk/rpc")
    );
    expect(rpcCalls.length).toBeGreaterThanOrEqual(1);
    await world.close();
  });

  it("uses chatAgentsByPlayerId.invoke for chat instead of executeTool", async () => {
    const agentId = "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d";
    const mainNodeId = "75c4aeb12681a2526c0e4cacbe8c7d45afeab99d2d09d07d68ed8b8e5b6d3dc3";
    const forwardedEnvelope = {
      requestId: "d4c6888d-188f-4972-b812-600d8c47fd90",
      mainNodeId,
      toPlayerId: mainNodeId,
      fromPlayerId: agentId,
      kind: "chat" as const,
      status: "forwarded" as const,
      channelKey: `intercom:human:${mainNodeId}:agent:${agentId}`,
      command: {
        requestId: "d4c6888d-188f-4972-b812-600d8c47fd90",
        mainNodeId,
        fromPlayerId: mainNodeId,
        toPlayerId: agentId,
        kind: "chat" as const,
        text: "hello",
      },
      ts: "2026-04-10T20:57:07.622Z",
    };
    intercomSseMessages.items = [
      {
        event: WORLD_INTERCOM_EVENT,
        data: JSON.stringify(forwardedEnvelope),
      },
    ];
    const executeTool = vi.fn(() => ({ mode: "chat", message: "wrong" }));
    const invoke = vi.fn(async () => ({
      messages: [{ role: "assistant", content: "from-invoke" }],
    }));
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    world.subscribeIntercomCommands({
      playerIds: [agentId],
      executeTool,
      chatAgentsByPlayerId: new Map([[agentId, { invoke }]]),
    });
    await vi.waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });
    expect(executeTool).not.toHaveBeenCalled();
    const bodyStr = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/sdk/rpc")
    )?.[1]?.body;
    expect(typeof bodyStr).toBe("string");
    const body = JSON.parse(String(bodyStr)) as { payload?: { result?: { message?: string } } };
    expect(body.payload?.result?.message).toBe("from-invoke");
    await world.close();
  });

  it("accepts legacy playerId option as a single-id subscription", async () => {
    const agentId = "agent-one";
    intercomSseMessages.items = [
      {
        event: WORLD_INTERCOM_EVENT,
        data: JSON.stringify({
          requestId: "r1",
          mainNodeId: "m1",
          toPlayerId: "m1",
          fromPlayerId: agentId,
          kind: "chat",
          status: "forwarded",
          channelKey: "k",
          command: {
            requestId: "r1",
            mainNodeId: "m1",
            fromPlayerId: "m1",
            toPlayerId: agentId,
            kind: "chat",
            text: "x",
          },
          ts: "2026-01-01T00:00:00.000Z",
        }),
      },
    ];
    const executeTool = vi.fn(() => ({}));
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    world.subscribeIntercomCommands({
      playerId: agentId,
      executeTool,
    });
    await vi.waitFor(() => {
      expect(executeTool).toHaveBeenCalledTimes(1);
    });
    await world.close();
  });

  it("passes through long-running assist-style media result payloads", async () => {
    const agentId = "agent-media";
    intercomSseMessages.items = [
      {
        event: WORLD_INTERCOM_EVENT,
        data: JSON.stringify({
          requestId: "r-media",
          mainNodeId: "m1",
          toPlayerId: "m1",
          fromPlayerId: agentId,
          kind: "assist",
          status: "forwarded",
          channelKey: "intercom:human:m1:agent:agent-media",
          command: {
            requestId: "r-media",
            mainNodeId: "m1",
            fromPlayerId: "m1",
            toPlayerId: agentId,
            kind: "assist",
            toolName: "assist_pipeline_review",
            args: {},
          },
          ts: "2026-01-01T00:00:00.000Z",
        }),
      },
    ];
    const executeTool = vi.fn(() => ({
      messageKind: "media",
      media: {
        mediaType: "image",
        url: "https://example.com/image.png",
      },
    }));
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    world.subscribeIntercomCommands({
      playerId: agentId,
      executeTool,
    });
    await vi.waitFor(() => {
      expect(executeTool).toHaveBeenCalledTimes(1);
    });
    const bodyStr = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/sdk/rpc")
    )?.[1]?.body;
    expect(typeof bodyStr).toBe("string");
    const body = JSON.parse(String(bodyStr)) as {
      payload?: { result?: { messageKind?: string; media?: { url?: string } } };
    };
    expect(body.payload?.result?.messageKind).toBe("media");
    expect(body.payload?.result?.media?.url).toBe("https://example.com/image.png");
    await world.close();
  });

});
