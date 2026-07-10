import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getSharedRedisClient } = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSharedRedisClient,
}));

import { GET } from "./route.js";

describe("GET /api/scanner/txs", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
  });

  it("returns 503 when redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const res = await GET(new NextRequest("http://localhost/api/scanner/txs"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Scanner unavailable");
  });

  it("returns 400 for invalid sinceMs", async () => {
    getSharedRedisClient.mockReturnValue({} as never);
    const res = await GET(
      new NextRequest("http://localhost/api/scanner/txs?sinceMs=bad")
    );
    expect(res.status).toBe(400);
  });
});
