import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getRepository, getSharedRedisClient, registerOrganization } =
  vi.hoisted(() => ({
    getRepository: vi.fn(),
    getSharedRedisClient: vi.fn(),
    registerOrganization: vi.fn(),
  }));

vi.mock("@/server/get-world", () => ({
  getRepository,
  getSharedRedisClient,
}));

vi.mock("@/server/agent-play/register-organization", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/agent-play/register-organization")
  >("@/server/agent-play/register-organization");
  return {
    ...actual,
    registerOrganization,
  };
});

import { POST } from "./route.js";

describe("POST /api/agent-play/organizations", () => {
  beforeEach(() => {
    getRepository.mockReset();
    getSharedRedisClient.mockReset();
    registerOrganization.mockReset();
  });

  it("returns 503 when Redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    getRepository.mockResolvedValue({});
    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/organizations", {
        method: "POST",
        body: JSON.stringify({
          organizationName: "Northwind Agents",
          email: "ops@northwind.test",
        }),
      }),
    );
    expect(res.status).toBe(503);
  });

  it("creates the organization and returns credentials for download", async () => {
    const redis = { hset: vi.fn(), sadd: vi.fn() };
    getSharedRedisClient.mockReturnValue(redis);
    getRepository.mockResolvedValue({ getGenesisNodeId: () => "root" });
    registerOrganization.mockResolvedValue({
      organization: {
        organizationName: "Northwind Agents",
        email: "ops@northwind.test",
        website: "",
        details: "",
        nodeId: "org-node-1",
        createdAt: "2026-08-19T22:00:00.000Z",
      },
      credentials: {
        serverUrl: "https://agent-play.com",
        nodeId: "org-node-1",
        passw: "alpha bravo charlie delta echo foxtrot golf hotel india juliet",
      },
      nextSteps: {
        cliDocHref: "/doc/cli",
        initializeDocHref: "/doc/initialize-agent-server-and-template",
        installCommand: "npx agent-play initialize",
      },
    });

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/organizations", {
        method: "POST",
        body: JSON.stringify({
          organizationName: "Northwind Agents",
          email: "ops@northwind.test",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      credentials: { nodeId: string; passw: string };
      nextSteps: { cliDocHref: string };
    };
    expect(body.credentials.nodeId).toBe("org-node-1");
    expect(body.credentials.passw.split(" ").length).toBeGreaterThanOrEqual(10);
    expect(body.nextSteps.cliDocHref).toBe("/doc/cli");
    expect(registerOrganization).toHaveBeenCalledTimes(1);
  });
});
