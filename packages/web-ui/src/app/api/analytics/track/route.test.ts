import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getSharedRedisClient, validateAgentPlaySession } = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
  validateAgentPlaySession: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSharedRedisClient,
}));

vi.mock("@/server/agent-play/session-validation", () => ({
  validateAgentPlaySession,
}));

import { POST } from "./route.js";

describe("POST /api/analytics/track", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns 503 when redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const res = await POST(
      new NextRequest("http://localhost/api/analytics/track?sid=sid-1", {
        method: "POST",
        body: JSON.stringify({
          event: "UI Presentation Action",
          distinctId: "sid-1",
          properties: { action: "AssistAction" },
        }),
      })
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Analytics unavailable");
  });

  it("returns 400 when sid is missing", async () => {
    getSharedRedisClient.mockReturnValue({});
    const res = await POST(
      new NextRequest("http://localhost/api/analytics/track", {
        method: "POST",
        body: JSON.stringify({
          event: "UI Presentation Action",
          distinctId: "sid-1",
          properties: { action: "AssistAction" },
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
