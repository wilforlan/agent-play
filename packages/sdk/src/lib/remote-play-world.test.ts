import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RemotePlayWorld,
  type RemotePlayWorldNodeCredentials,
} from "./remote-play-world.js";
import {
  SESSION_CLOSED_EVENT,
  SESSION_CONNECTED_EVENT,
} from "../world-events.js";
import {
  deriveNodeIdFromPassword,
  nodeCredentialsMaterialFromHumanPassphrase,
} from "@agent-play/node-tools";

const BASE_URL = "http://127.0.0.1:3000";
const SESSION_URL = `${BASE_URL}/api/agent-play/session`;
const VALIDATE_URL = `${BASE_URL}/api/nodes/validate`;
const DEFAULT_NODE_ID = "n1";

function sessionResponse(): Response {
  return new Response(JSON.stringify({ sid: "sid-1" }), { status: 200 });
}

function notFound(): Response {
  return new Response("not found", { status: 404 });
}

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

function expectedNodeAuthHeaders(humanPassphrase: string): Record<string, string> {
  const material = nodeCredentialsMaterialFromHumanPassphrase(humanPassphrase);
  const nodeId = deriveNodeIdFromPassword({
    password: material,
    rootKey: DEFAULT_NODE_ID,
  });
  return {
    "x-node-id": nodeId,
    "x-node-passw": material,
  };
}

function sampleRegisteredAgent(agentId: string, name: string) {
  return {
    agentId,
    name,
    toolNames: ["chat_tool"],
    zoneCount: 0,
    yieldCount: 0,
    flagged: false,
  };
}

describe("RemotePlayWorld", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when nodeCredentials is missing", () => {
    const prevPath = process.env.AGENT_PLAY_CREDENTIALS_PATH;
    process.env.AGENT_PLAY_CREDENTIALS_PATH = join(
      tmpdir(),
      "missing-agent-play-credentials.json"
    );
    try {
      expect(() => new RemotePlayWorld({ baseUrl: BASE_URL })).toThrow(/nodeCredentials/);
    } finally {
      if (prevPath === undefined) {
        delete process.env.AGENT_PLAY_CREDENTIALS_PATH;
      } else {
        process.env.AGENT_PLAY_CREDENTIALS_PATH = prevPath;
      }
    }
  });

  it("loads baseUrl and node credentials from credentials.json when options are empty", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-play-sdk-cred-"));
    const rootKey = DEFAULT_NODE_ID;
    const humanPassw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const material = nodeCredentialsMaterialFromHumanPassphrase(humanPassw);
    const nodeId = deriveNodeIdFromPassword({ password: material, rootKey });
    const credentialsPath = join(dir, "credentials.json");
    writeFileSync(join(dir, ".root"), `${rootKey}\n`, "utf8");
    writeFileSync(
      credentialsPath,
      JSON.stringify({
        serverUrl: BASE_URL,
        nodeId,
        passw: humanPassw,
      }),
      "utf8"
    );
    const prevPath = process.env.AGENT_PLAY_CREDENTIALS_PATH;
    const prevCwd = process.cwd();
    process.env.AGENT_PLAY_CREDENTIALS_PATH = credentialsPath;
    process.chdir(dir);
    try {
      const fetchMock = vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        return notFound();
      });
      vi.stubGlobal("fetch", fetchMock);
      const world = new RemotePlayWorld({});
      await world.connect();
      expect(fetchMock).toHaveBeenCalledWith(
        SESSION_URL,
        expect.objectContaining({ headers: expectedNodeAuthHeaders(humanPassw) })
      );
      await world.close();
    } finally {
      process.chdir(prevCwd);
      if (prevPath === undefined) {
        delete process.env.AGENT_PLAY_CREDENTIALS_PATH;
      } else {
        process.env.AGENT_PLAY_CREDENTIALS_PATH = prevPath;
      }
    }
  });

  it("connect validates then uses GET session when mainNodeId is provided", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const material = nodeCredentialsMaterialFromHumanPassphrase("key");
    const derivedNodeId = deriveNodeIdFromPassword({
      password: material,
      rootKey: DEFAULT_NODE_ID,
    });
    const mainParentId = "main-account-node-1";
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        const headers = init.headers as Record<string, string>;
        expect(headers["x-node-id"]).toBe(derivedNodeId);
        expect(headers["x-node-passw"]).toBe(material);
        const body = JSON.parse(String(init.body)) as {
          nodeId?: string;
          rootKey?: string;
          mainNodeId?: string;
        };
        expect(body.nodeId).toBe(derivedNodeId);
        expect(body.rootKey).toBe(DEFAULT_NODE_ID);
        expect(body.mainNodeId).toBe(mainParentId);
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), { status: 200 });
      }
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld("key");
    await world.connect({ mainNodeId: mainParentId });
    expect(world.getSessionId()).toBe("sid-1");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(VALIDATE_URL);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(SESSION_URL);
    expect(infoSpy).toHaveBeenCalledWith(
      "[agent-play] Node identity validated (agent)."
    );
    infoSpy.mockRestore();
    await world.close();
  });

  it("connect uses world session when mainNodeId is omitted", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    expect(world.getSessionId()).toBe("sid-1");
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_URL,
      expect.objectContaining({ headers: expectedNodeAuthHeaders("key") })
    );
    const validateCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/nodes/validate")
    );
    expect(validateCalls.length).toBe(0);
    await world.close();
  });

  it("connect throws when node validation fails with mainNodeId", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ ok: false, reason: "agent parent mismatch" }),
          { status: 400 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await expect(world.connect({ mainNodeId: "wrong-main" })).rejects.toThrow(
      /agent parent mismatch/
    );
  });

  it("emits session connected then session closed when onSessionEvent is set", async () => {
    const events: string[] = [];
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = new RemotePlayWorld({
      baseUrl: BASE_URL,
      nodeCredentials: nodeCredentialsFromHumanPhrase("k"),
      onSessionEvent: (e) => {
        events.push(e.name);
      },
    });
    await world.connect();
    await world.close();
    expect(events).toEqual([SESSION_CONNECTED_EVENT, SESSION_CLOSED_EVENT]);
  });

  it("prints RemotePlayWorld transport logs when logging is on", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = new RemotePlayWorld({
      baseUrl: BASE_URL,
      nodeCredentials: nodeCredentialsFromHumanPhrase("k"),
      logging: "on",
    });
    await world.connect();
    const transportLogs = infoSpy.mock.calls.filter((c) =>
      String(c[0]).includes("[agent-play:RemotePlayWorld]")
    );
    expect(transportLogs.length).toBeGreaterThan(0);
    infoSpy.mockRestore();
    await world.close();
  });

  it("connect reads session sid from the web UI", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    expect(world.getSessionId()).toBe("sid-1");
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_URL,
      expect.objectContaining({ headers: expectedNodeAuthHeaders("k") })
    );
    await world.close();
  });

  it("addAgent posts nodeId as agentId to players route with sid and world password", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            nodeId?: string;
            rootKey?: string;
            mainNodeId?: string;
          };
          expect(body.nodeId).toBe("aid-1");
          expect(body.rootKey).toBe(DEFAULT_NODE_ID);
          expect(body.mainNodeId).toBe(
            deriveNodeIdFromPassword({
              password: nodeCredentialsMaterialFromHumanPassphrase("key"),
              rootKey: DEFAULT_NODE_ID,
            })
          );
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            password?: string;
            mainNodeId?: string;
            agentId?: string;
          };
          const material = nodeCredentialsMaterialFromHumanPassphrase("key");
          expect(body.password).toBe(material);
          expect(body.mainNodeId).toBe(
            deriveNodeIdFromPassword({
              password: material,
              rootKey: DEFAULT_NODE_ID,
            })
          );
          expect(body.agentId).toBe("aid-1");
          return new Response(
            JSON.stringify({
              playerId: "p1",
              previewUrl: `${BASE_URL}/agent-play/watch`,
              registeredAgent: sampleRegisteredAgent("aid-1", "a"),
            }),
            { status: 200 }
          );
        }
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld("key");
    await world.connect();
    const player = await world.addAgent({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-1",
    });
    expect(player.id).toBe("p1");
    expect(player.previewUrl).toBe(`${BASE_URL}/agent-play/watch`);
    expect(player.registeredAgent.agentId).toBe("aid-1");
    expect(player.enableP2a).toBe("off");
    await world.close();
  });

  it("addAgent forwards enableP2a on the wire and prefers server echo on RegisteredPlayer", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { enableP2a?: string };
          expect(body.enableP2a).toBe("on");
          return new Response(
            JSON.stringify({
              playerId: "p2",
              previewUrl: `${BASE_URL}/agent-play/watch`,
              registeredAgent: sampleRegisteredAgent("aid-2", "b"),
              enableP2a: "on",
            }),
            { status: 200 }
          );
        }
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    const player = await world.addAgent({
      name: "b",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-2",
      enableP2a: "on",
    });
    expect(player.enableP2a).toBe("on");
    await world.close();
  });

  it("addAgent returns realtimeWebrtc payload when server provides client secret", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              playerId: "p3",
              previewUrl: `${BASE_URL}/agent-play/watch`,
              registeredAgent: sampleRegisteredAgent("aid-3", "c"),
              enableP2a: "on",
              realtimeWebrtc: {
                clientSecret: "cs_test_123",
                model: "gpt-realtime",
                voice: "marin",
                expiresAt: "2026-04-25T11:00:00.000Z",
              },
            }),
            { status: 200 }
          );
        }
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    const player = await world.addAgent({
      name: "c",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-3",
      enableP2a: "on",
    });
    expect(player.realtimeWebrtc).toEqual({
      clientSecret: "cs_test_123",
      model: "gpt-realtime",
      voice: "marin",
      expiresAt: "2026-04-25T11:00:00.000Z",
    });
    await world.close();
  });

  it("initAudio mints realtime client secret and addAgent forwards it to players route", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (
          u === "https://api.openai.com/v1/realtime/client_secrets" &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              value: "cs_sdk_123",
              expires_at: "2026-04-25T11:30:00.000Z",
            }),
            { status: 200 }
          );
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            realtimeInstructions?: string;
            realtimeWebrtc?: {
              clientSecret: string;
              model: string;
              voice?: string;
              expiresAt?: string;
            };
          };
          expect(body.realtimeInstructions).toBe(
            "You are d. Keep responses short, clear, and conversational unless asked for detail."
          );
          expect(body.realtimeWebrtc).toEqual({
            clientSecret: "cs_sdk_123",
            model: "gpt-realtime",
            voice: "marin",
            expiresAt: "2026-04-25T11:30:00.000Z",
          });
          return new Response(
            JSON.stringify({
              playerId: "p4",
              previewUrl: `${BASE_URL}/agent-play/watch`,
              registeredAgent: sampleRegisteredAgent("aid-4", "d"),
              enableP2a: "on",
              realtimeWebrtc: body.realtimeWebrtc,
            }),
            { status: 200 }
          );
        }
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    world.initAudio({
      openai: {
        apiKey: "sk-sdk-test",
        model: "gpt-realtime",
        voice: "marin",
      },
    });
    const player = await world.addAgent({
      name: "d",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-4",
      enableP2a: "on",
    });
    expect(player.realtimeWebrtc?.clientSecret).toBe("cs_sdk_123");
    await world.close();
  });

  it("initAudio throws on addAgent when OPENAI_API_KEY is missing", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
          status: 200,
        });
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    world.initAudio({
      openai: {
        apiKey: "",
      },
    });
    await expect(
      world.addAgent({
        name: "voice",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
        nodeId: "aid-voice",
        enableP2a: "on",
      })
    ).rejects.toThrow(/OPENAI_API_KEY/i);
    await world.close();
  });

  it("addAgent throws when agent node validation fails", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ ok: false, reason: "unknown node id" }),
          { status: 400 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    await expect(
      world.addAgent({
        name: "a",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
        nodeId: "aid-missing",
      })
    ).rejects.toThrow(/unknown node id/);
    const playerCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/agent-play/players")
    );
    expect(playerCalls).toHaveLength(0);
    await world.close();
  });

  it("addAgent starts heartbeat and close sends disconnect", async () => {
    vi.useFakeTimers();
    let heartbeatCount = 0;
    let disconnectCount = 0;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
          status: 200,
        });
      }
      if (u.includes("/api/agent-play/players/heartbeat") && init?.method === "POST") {
        heartbeatCount += 1;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/agent-play/players/disconnect") && init?.method === "POST") {
        disconnectCount += 1;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/agent-play/players") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            playerId: "p1",
            previewUrl: `${BASE_URL}/agent-play/watch`,
            registeredAgent: sampleRegisteredAgent("aid-1", "a"),
            connectionId: "conn-1",
            leaseTtlSeconds: 45,
          }),
          { status: 200 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    await world.addAgent({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-1",
    });
    await vi.advanceTimersByTimeAsync(24_000);
    expect(heartbeatCount).toBeGreaterThan(0);
    await world.close();
    expect(disconnectCount).toBe(1);
    vi.useRealTimers();
  });

  it("heartbeat retries with 10s delay until success after transient failures", async () => {
    vi.useFakeTimers();
    let heartbeatTick: (() => void) | undefined;
    const intervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((handler, timeout) => {
        const ms = typeof timeout === "number" ? timeout : Number(timeout);
        if (ms === 12_000 && typeof handler === "function") {
          heartbeatTick = handler as () => void;
        }
        return 1 as unknown as ReturnType<typeof setInterval>;
      });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    let heartbeatFetchCount = 0;
    let failBudget = 2;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
          status: 200,
        });
      }
      if (u.includes("/api/agent-play/players/heartbeat") && init?.method === "POST") {
        heartbeatFetchCount += 1;
        if (failBudget > 0) {
          failBudget -= 1;
          return new Response("temp unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/agent-play/players/disconnect") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/agent-play/players") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            playerId: "p1",
            previewUrl: `${BASE_URL}/agent-play/watch`,
            registeredAgent: sampleRegisteredAgent("aid-1", "a"),
            connectionId: "conn-1",
            leaseTtlSeconds: 45,
          }),
          { status: 200 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    await world.addAgent({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-1",
    });
    expect(heartbeatTick).toBeDefined();
    heartbeatTick?.();
    await vi.runAllTimersAsync();
    expect(heartbeatFetchCount).toBe(3);
    expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(
      infoSpy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("heartbeat:retry_recovered")
      )
    ).toBe(true);
    intervalSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    await world.close();
    vi.useRealTimers();
  });

  it("heartbeat exhausts 10 attempts then logs exhausted error", async () => {
    vi.useFakeTimers();
    let heartbeatTick: (() => void) | undefined;
    const intervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((handler, timeout) => {
        const ms = typeof timeout === "number" ? timeout : Number(timeout);
        if (ms === 12_000 && typeof handler === "function") {
          heartbeatTick = handler as () => void;
        }
        return 1 as unknown as ReturnType<typeof setInterval>;
      });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let heartbeatFetchCount = 0;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
          status: 200,
        });
      }
      if (u.includes("/api/agent-play/players/heartbeat") && init?.method === "POST") {
        heartbeatFetchCount += 1;
        return new Response("always fail", { status: 503 });
      }
      if (u.includes("/api/agent-play/players/disconnect") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/agent-play/players") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            playerId: "p1",
            previewUrl: `${BASE_URL}/agent-play/watch`,
            registeredAgent: sampleRegisteredAgent("aid-1", "a"),
            connectionId: "conn-1",
            leaseTtlSeconds: 45,
          }),
          { status: 200 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    await world.addAgent({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-1",
    });
    expect(heartbeatTick).toBeDefined();
    heartbeatTick?.();
    await vi.runAllTimersAsync();
    expect(heartbeatFetchCount).toBe(10);
    expect(
      errSpy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("heartbeat:exhausted")
      )
    ).toBe(true);
    intervalSpy.mockRestore();
    errSpy.mockRestore();
    await world.close();
    vi.useRealTimers();
  });

  it("addAgent ignores input.mainNodeId and always uses derived node id", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/agent-play/session")) {
        return sessionResponse();
      }
      if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { mainNodeId?: string };
        expect(body.mainNodeId).toBe(
          deriveNodeIdFromPassword({
            password: nodeCredentialsMaterialFromHumanPassphrase("key"),
            rootKey: DEFAULT_NODE_ID,
          })
        );
        return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
          status: 200,
        });
      }
      if (u.includes("/api/agent-play/players") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            playerId: "p1",
            previewUrl: `${BASE_URL}/agent-play/watch`,
            registeredAgent: sampleRegisteredAgent("aid-1", "a"),
          }),
          { status: 200 }
        );
      }
      return notFound();
    });
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld("key");
    await world.connect();
    await world.addAgent({
      name: "a",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      nodeId: "aid-1",
      mainNodeId: "should-be-ignored",
    });
    await world.close();
  });

  it("getWorldSnapshot posts without sid and parses worldMap occupants", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
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
                      kind: "human",
                      id: "__human__",
                      name: "You",
                      x: -1,
                      y: 0,
                    },
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
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
    await world.connect();
    const snap = await world.getWorldSnapshot();
    expect(snap.sid).toBe("sid-1");
    expect(snap.worldMap.occupants).toHaveLength(3);
    expect(snap.worldMap.occupants[0]?.kind).toBe("human");
    await world.close();
  });

  it("getWorldSnapshot preserves enableP2a on agent occupants when present", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
        }
        if (
          u.endsWith("/api/agent-play/sdk/rpc") &&
          !u.includes("sid=") &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              snapshot: {
                sid: "sid-p2a",
                worldMap: {
                  bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
                  occupants: [
                    {
                      kind: "agent",
                      agentId: "a-p2a",
                      name: "Voice",
                      x: 0,
                      y: 0,
                      enableP2a: "on",
                    },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    const world = playWorld();
    await world.connect();
    const snap = await world.getWorldSnapshot();
    const occ = snap.worldMap.occupants[0];
    expect(occ?.kind).toBe("agent");
    if (occ?.kind === "agent") {
      expect(occ.enableP2a).toBe("on");
    }
    await world.close();
  });

  it("getPlayerChainNode posts getPlayerChainNode op without sid query", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/agent-play/session")) {
          return sessionResponse();
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
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
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
          return sessionResponse();
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
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
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
          return sessionResponse();
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
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
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
          return sessionResponse();
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
        return notFound();
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = playWorld();
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
    const world = playWorld();
    const p = world.hold().for(0.05);
    await vi.advanceTimersByTimeAsync(50);
    await p;
    vi.useRealTimers();
  });

  it("hold().for throws when seconds is not finite", async () => {
    const world = playWorld();
    await expect(world.hold().for(Number.NaN)).rejects.toThrow(/finite/);
  });

  it("onClose runs when close is called and close is idempotent", async () => {
    const world = playWorld();
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
    const world = playWorld();
    let n = 0;
    const off = world.onClose(() => {
      n += 1;
    });
    off();
    await world.close();
    expect(n).toBe(0);
  });
});
