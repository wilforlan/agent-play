import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getRepository, getSharedRedisClient, registerOrganization, listOrganizations } =
  vi.hoisted(() => ({
    getRepository: vi.fn(),
    getSharedRedisClient: vi.fn(),
    registerOrganization: vi.fn(),
    listOrganizations: vi.fn(),
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
    listOrganizations,
  };
});

import { GET, POST } from "./route.js";

describe("POST /api/agent-play/organizations", () => {
  beforeEach(() => {
    getRepository.mockReset();
    getSharedRedisClient.mockReset();
    registerOrganization.mockReset();
    listOrganizations.mockReset();
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

describe("GET /api/agent-play/organizations", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
    listOrganizations.mockReset();
  });

  it("returns 503 when Redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns registered organizations for the public catalog", async () => {
    getSharedRedisClient.mockReturnValue({
      hgetall: vi.fn(),
      smembers: vi.fn(),
    });
    listOrganizations.mockResolvedValue([
      {
        nodeId: "org-node-1",
        organizationName: "Northwind Agents",
        website: "https://northwind.test",
        details: "Helpdesk and onboarding agents",
        createdAt: "2026-08-19T22:00:00.000Z",
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      organizations: Array<{ organizationName: string; website: string }>;
    };
    expect(body.organizations).toEqual([
      {
        nodeId: "org-node-1",
        organizationName: "Northwind Agents",
        website: "https://northwind.test",
        details: "Helpdesk and onboarding agents",
        createdAt: "2026-08-19T22:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("@");
    expect(listOrganizations).toHaveBeenCalledTimes(1);
  });
});
