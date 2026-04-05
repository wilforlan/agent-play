import { afterEach, describe, expect, it, vi } from "vitest";
import { RemotePlayWorld } from "./remote-play-world.js";

const sampleRegisteredAgent = (agentId: string, name: string) => ({
  agentId,
  name,
  toolNames: ["chat_tool"],
  zoneCount: 0,
  yieldCount: 0,
  flagged: false,
});

describe("RemotePlayWorld", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when apiKey is missing or empty", () => {
    expect(
      () =>
        new RemotePlayWorld({
          baseUrl: "http://127.0.0.1:3000",
          apiKey: "",
        })
    ).toThrow(/apiKey/);
  });

  it("connect reads session sid from the web UI", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    expect(world.getSessionId()).toBe("sid-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/agent-play/session",
      expect.objectContaining({ headers: {} })
    );
    await world.close();
  });

  it("addPlayer posts to players route with sid and world apiKey", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            apiKey?: string;
            agentId?: string;
          };
          expect(body.apiKey).toBe("key");
          expect(body.agentId).toBe("aid-1");
          return new Response(
            JSON.stringify({
              playerId: "p1",
              previewUrl: "http://127.0.0.1:3000/agent-play/watch",
              registeredAgent: sampleRegisteredAgent("aid-1", "a"),
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "key",
    });
    await world.connect();
    const player = await world.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "aid-1",
    });
    expect(player.id).toBe("p1");
    expect(player.previewUrl).toBe("http://127.0.0.1:3000/agent-play/watch");
    expect(player.registeredAgent.agentId).toBe("aid-1");
    await world.close();
  });

  it("getWorldSnapshot posts without sid and parses worldMap occupants", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (
          u.endsWith("/api/agent-play/sdk/rpc") &&
          !u.includes("sid=") &&
          init?.method === "POST"
        ) {
          const body = JSON.parse(String(init.body)) as { op?: string };
          expect(body.op).toBe("getWorldSnapshot");
          return new Response(
            JSON.stringify({
              snapshot: {
                sid: "sid-1",
                worldMap: {
                  bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 },
                  occupants: [
                    {
                      kind: "agent",
                      agentId: "p1",
                      name: "Alpha",
                      x: 0,
                      y: 0,
                    },
                    {
                      kind: "agent",
                      agentId: "p2",
                      name: "Beta",
                      x: 1,
                      y: 0,
                    },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    const snap = await world.getWorldSnapshot();
    expect(snap.sid).toBe("sid-1");
    expect(snap.worldMap.occupants).toHaveLength(2);
    expect(snap.worldMap.occupants[0]?.kind).toBe("agent");
    await world.close();
  });

  it("getPlayerChainNode posts getPlayerChainNode op without sid query", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (
          u.endsWith("/api/agent-play/sdk/rpc") &&
          !u.includes("sid=") &&
          init?.method === "POST"
        ) {
          const body = JSON.parse(String(init.body)) as { op?: string };
          expect(body.op).toBe("getPlayerChainNode");
          return new Response(
            JSON.stringify({
              node: {
                kind: "genesis",
                stableKey: "__genesis__",
                text: "root-bytes",
              },
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    const node = await world.getPlayerChainNode("__genesis__");
    expect(node.kind).toBe("genesis");
    if (node.kind === "genesis") {
      expect(node.text).toBe("root-bytes");
    }
    await world.close();
  });

  it("getWorldSnapshot parses platform on agent occupants", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (
          u.endsWith("/api/agent-play/sdk/rpc") &&
          !u.includes("sid=") &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              snapshot: {
                sid: "sid-1",
                worldMap: {
                  bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
                  occupants: [
                    {
                      kind: "agent",
                      agentId: "p1",
                      name: "Alpha",
                      x: 0,
                      y: 0,
                      platform: "langchain",
                    },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    const snap = await world.getWorldSnapshot();
    const occ = snap.worldMap.occupants[0];
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.platform).toBe("langchain");
    }
    await world.close();
  });

  it("getWorldSnapshot maps deprecated agentType field to platform", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (
          u.endsWith("/api/agent-play/sdk/rpc") &&
          !u.includes("sid=") &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              snapshot: {
                sid: "sid-1",
                worldMap: {
                  bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
                  occupants: [
                    {
                      kind: "agent",
                      agentId: "p1",
                      name: "Alpha",
                      x: 0,
                      y: 0,
                      agentType: "langchain",
                    },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    const snap = await world.getWorldSnapshot();
    const occ = snap.worldMap.occupants[0];
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.platform).toBe("langchain");
    }
    await world.close();
  });

  it("recordInteraction sends rpc payload", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
        }
        if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            op?: string;
            payload?: { playerId?: string };
          };
          expect(body.op).toBe("recordInteraction");
          expect(body.payload?.playerId).toBe("p1");
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await world.connect();
    await world.recordInteraction({
      playerId: "p1",
      role: "user",
      text: "hi",
    });
    await world.close();
  });

  it("hold().for resolves after delay", async () => {
    vi.useFakeTimers();
    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    const p = world.hold().for(0.05);
    await vi.advanceTimersByTimeAsync(50);
    await p;
    vi.useRealTimers();
  });

  it("hold().for throws when seconds is not finite", async () => {
    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    await expect(world.hold().for(Number.NaN)).rejects.toThrow(/finite/);
  });

  it("onClose runs when close is called and close is idempotent", async () => {
    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    let n = 0;
    const off = world.onClose(() => {
      n += 1;
    });
    await world.close();
    expect(n).toBe(1);
    await world.close();
    expect(n).toBe(1);
    off();
    await world.close();
    expect(n).toBe(1);
  });

  it("onClose can unsubscribe before close", async () => {
    const world = new RemotePlayWorld({
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "k",
    });
    let n = 0;
    const off = world.onClose(() => {
      n += 1;
    });
    off();
    await world.close();
    expect(n).toBe(0);
  });
});
