import { describe, expect, it } from "vitest";
import {
  postGeographyCoarse,
  postGeographyMembership,
  postGeographySignal,
} from "./preview-geography-mesh-api.js";

describe("preview-geography-mesh-api", () => {
  it("posts membership join and surfaces cap_reached", async () => {
    const calls: { url: string; body: string }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({
        url: String(input),
        body: String(init?.body ?? ""),
      });
      return new Response(
        JSON.stringify({
          error: "cap_reached",
          message: "full",
          memberCount: 100,
          cap: 100,
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    };
    try {
      const result = await postGeographyMembership({
        apiBase: "https://example.test/api/agent-play",
        sid: "s1",
        body: {
          action: "join",
          humanId: "h1",
          name: "Ada",
          x: 1,
          y: 2,
        },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(409);
        expect(result.cap?.cap).toBe(100);
      }
      expect(calls[0]?.url).toContain("/geography/membership?sid=s1");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("posts coarse and signal", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          ok: true,
          neighbors: {
            humanId: "h1",
            neighborIds: ["h2"],
            truncated: false,
            memberCount: 2,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    try {
      const neighbors = await postGeographyCoarse({
        apiBase: "https://example.test/api/agent-play",
        sid: "s1",
        body: { humanId: "h1", x: 3, y: 4 },
      });
      expect(neighbors?.neighborIds).toEqual(["h2"]);
      const signaled = await postGeographySignal({
        apiBase: "https://example.test/api/agent-play",
        sid: "s1",
        body: {
          fromHumanId: "h1",
          toHumanId: "h2",
          kind: "offer",
          payload: { type: "offer" },
        },
      });
      expect(signaled).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});
