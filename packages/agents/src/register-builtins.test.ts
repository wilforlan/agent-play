import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerBuiltinAgents } from "./register-builtins.js";

function mockRegisteredAgent(name: string, agentId: string) {
  return {
    agentId,
    name,
    toolNames: ["chat_tool"],
    zoneCount: 0,
    yieldCount: 0,
    flagged: false,
  };
}

describe("registerBuiltinAgents", () => {
  const originalCredentialsPath = process.env.AGENT_PLAY_CREDENTIALS_PATH;
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir !== undefined) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    if (originalCredentialsPath === undefined) {
      delete process.env.AGENT_PLAY_CREDENTIALS_PATH;
    } else {
      process.env.AGENT_PLAY_CREDENTIALS_PATH = originalCredentialsPath;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setCredentialsFixture(): void {
    const dir = mkdtempSync(join(tmpdir(), "agent-play-register-builtins-"));
    const filePath = join(dir, "credentials.json");
    writeFileSync(
      filePath,
      JSON.stringify({
        serverUrl: "http://127.0.0.1:3000",
        nodeId:
          "87b6637b010478e48a83a8d445041ae4df5d607df7932153cdfee5c601e8e39e",
        passw:
          "amber angle apple arch atlas aura autumn bamboo beacon birch blossom",
      }),
      "utf8"
    );
    process.env.AGENT_PLAY_CREDENTIALS_PATH = filePath;
    tempDirs.push(dir);
  }

  it("returns world and registers built-ins when snapshot empty", async () => {
    setCredentialsFixture();
    let addPlayerCount = 0;
    let validateCount = 0;
    let sawConnectValidation = false;
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          validateCount += 1;
          const body = JSON.parse(String(init.body)) as {
            nodeId?: string;
            mainNodeId?: string;
          };
          expect(typeof body.nodeId).toBe("string");
          if (
            body.mainNodeId ===
            "87b6637b010478e48a83a8d445041ae4df5d607df7932153cdfee5c601e8e39e"
          ) {
            sawConnectValidation = true;
          }
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-z" }), { status: 200 });
        }
        if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { op?: string };
          if (body.op === "getWorldSnapshot") {
            return new Response(
              JSON.stringify({
                snapshot: {
                  sid: "sid-z",
                  worldMap: {
                    bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
                    occupants: [],
                  },
                },
              }),
              { status: 200 }
            );
          }
        }
        if (
          new URL(u).pathname === "/api/agent-play/players" &&
          init?.method === "POST"
        ) {
          addPlayerCount += 1;
          const body = JSON.parse(String(init.body)) as {
            name?: string;
            agent?: unknown;
            agentId?: string;
          };
          expect(body.agent).toEqual(
            expect.objectContaining({
              type: "langchain",
              toolNames: expect.arrayContaining(["chat_tool"]),
            })
          );
          expect(typeof body.agentId).toBe("string");
          expect(body.agentId?.length).toBeGreaterThan(0);
          const name = body.name ?? "agent";
          return new Response(
            JSON.stringify({
              playerId: `pid-${String(addPlayerCount)}`,
              previewUrl: "http://127.0.0.1:3000/agent-play/watch",
              registeredAgent: mockRegisteredAgent(
                name,
                body.agentId ?? `pid-${String(addPlayerCount)}`
              ),
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const world = await registerBuiltinAgents();

    expect(world).toBeDefined();
    expect(typeof world.hold).toBe("function");
    expect(addPlayerCount).toBe(2);
    expect(validateCount).toBe(3);
    expect(sawConnectValidation).toBe(true);
  });

  it("skips addAgent when built-in name already on snapshot", async () => {
    setCredentialsFixture();
    let addPlayerCount = 0;
    let validateCount = 0;
    let sawConnectValidation = false;
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/api/nodes/validate") && init?.method === "POST") {
          validateCount += 1;
          const body = JSON.parse(String(init.body)) as {
            mainNodeId?: string;
          };
          if (
            body.mainNodeId ===
            "87b6637b010478e48a83a8d445041ae4df5d607df7932153cdfee5c601e8e39e"
          ) {
            sawConnectValidation = true;
          }
          return new Response(JSON.stringify({ ok: true, nodeKind: "agent" }), {
            status: 200,
          });
        }
        if (u.endsWith("/api/agent-play/session")) {
          return new Response(JSON.stringify({ sid: "sid-z" }), { status: 200 });
        }
        if (u.includes("/api/agent-play/sdk/rpc") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              snapshot: {
                sid: "sid-z",
                worldMap: {
                  bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
                  occupants: [
                    {
                      kind: "agent",
                      agentId: "builtin-task-organizer",
                      name: "CFO AI",
                      x: 0,
                      y: 0,
                    },
                    {
                      kind: "agent",
                      agentId: "builtin-research-assistant",
                      name: "Sales AI",
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
        if (
          new URL(u).pathname === "/api/agent-play/players" &&
          init?.method === "POST"
        ) {
          addPlayerCount += 1;
          return new Response(
            JSON.stringify({
              playerId: "new",
              previewUrl: "http://127.0.0.1:3000/agent-play/watch",
              registeredAgent: mockRegisteredAgent("x", "new"),
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    await registerBuiltinAgents();

    expect(addPlayerCount).toBe(0);
    expect(validateCount).toBe(1);
    expect(sawConnectValidation).toBe(true);
  });
});
