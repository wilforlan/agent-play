import { afterEach, describe, expect, it, vi } from "vitest";
import { registerBuiltinAgents } from "./register-builtins.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  function createSecretFixture(): { secretFilePath: string; rootFilePath: string } {
    const dir = mkdtempSync(join(tmpdir(), "agent-play-agents-"));
    const secretPath = join(dir, "buffer.txt");
    const rootPath = join(dir, ".root");
    writeFileSync(secretPath, "dev-password\n", "utf8");
    writeFileSync(rootPath, "n1\n", "utf8");
    return { secretFilePath: secretPath, rootFilePath: rootPath };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses connect, getWorldSnapshot, and addPlayer once per built-in when snapshot empty", async () => {
    let addPlayerCount = 0;
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
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
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
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

    const fixture = createSecretFixture();
    await registerBuiltinAgents({
      baseUrl: "http://127.0.0.1:3000",
      secretFilePath: fixture.secretFilePath,
      rootFilePath: fixture.rootFilePath,
    });

    expect(addPlayerCount).toBe(3);
  });

  it("skips addPlayer when built-in name already on snapshot", async () => {
    let addPlayerCount = 0;
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
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
                      name: "Task organizer assistant",
                      x: 0,
                      y: 0,
                    },
                    {
                      kind: "agent",
                      agentId: "builtin-research-assistant",
                      name: "Research assistant",
                      x: 1,
                      y: 0,
                    },
                    {
                      kind: "agent",
                      agentId: "builtin-play-world-assistant",
                      name: "Play world assistant",
                      x: 2,
                      y: 0,
                    },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        if (u.includes("/api/agent-play/players") && init?.method === "POST") {
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

    const fixture = createSecretFixture();
    await registerBuiltinAgents({
      baseUrl: "http://127.0.0.1:3000",
      secretFilePath: fixture.secretFilePath,
      rootFilePath: fixture.rootFilePath,
    });

    expect(addPlayerCount).toBe(0);
  });
});
