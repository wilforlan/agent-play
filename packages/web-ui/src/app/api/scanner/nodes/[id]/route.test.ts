import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getSharedRedisClient } = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSharedRedisClient,
}));

vi.mock("@/server/scanner/scanner-node-profile", () => ({
  buildScannerNodeProfile: vi.fn(),
}));

import { buildScannerNodeProfile } from "@/server/scanner/scanner-node-profile";
import { GET } from "./route.js";

describe("GET /api/scanner/nodes/[id]", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
    vi.mocked(buildScannerNodeProfile).mockReset();
  });

  it("returns 503 when redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const res = await GET(new NextRequest("http://localhost/api/scanner/nodes/n1"), {
      params: Promise.resolve({ id: "n1" }),
    });
    expect(res.status).toBe(503);
  });

  it("returns 404 for unknown node", async () => {
    getSharedRedisClient.mockReturnValue({} as never);
    vi.mocked(buildScannerNodeProfile).mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/scanner/nodes/n1"), {
      params: Promise.resolve({ id: "n1" }),
    });
    expect(res.status).toBe(404);
  });
});
