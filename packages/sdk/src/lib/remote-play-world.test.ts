import { afterEach, describe, expect, it, vi } from "vitest";
import { RemotePlayWorld } from "./remote-play-world.js";

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

  it("start reads session sid from the web UI", async () => {
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
    await world.start();
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
              structures: [],
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
    await world.start();
    const player = await world.addPlayer({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "aid-1",
    });
    expect(player.id).toBe("p1");
    expect(player.previewUrl).toBe("http://127.0.0.1:3000/agent-play/watch");
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
    await world.start();
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
