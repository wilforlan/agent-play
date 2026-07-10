import { describe, expect, it, vi } from "vitest";
import { fetchPlayerWallet } from "./wallet-client.js";

const mockFetcher = (response: {
  ok: boolean;
  status?: number;
  body?: unknown;
}): typeof fetch =>
  vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  })) as unknown as typeof fetch;

describe("wallet-client: fetchPlayerWallet", () => {
  it("requests the sid-gated wallet URL", async () => {
    const fetcher = mockFetcher({
      ok: true,
      body: {
        wallet: {
          playerId: "p1",
          balanceUsd: 10,
          currency: "USD",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      },
    });
    await fetchPlayerWallet({ playerId: "p1", sid: "sid-1", fetcher });
    expect(fetcher).toHaveBeenCalledWith(
      "/agent-play/players/p1/wallet?sid=sid-1",
      { method: "GET" }
    );
  });

  it("unwraps the server's { wallet } envelope and returns the parsed payload", async () => {
    const fetcher = mockFetcher({
      ok: true,
      body: {
        wallet: {
          playerId: "p1",
          balanceUsd: 42,
          currency: "USD",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      },
    });
    const wallet = await fetchPlayerWallet({
      playerId: "p1",
      sid: "sid-1",
      fetcher,
    });
    expect(wallet.balanceUsd).toBe(42);
    expect(wallet.playerId).toBe("p1");
  });

  it("throws when the response is not ok", async () => {
    const fetcher = mockFetcher({ ok: false, status: 404 });
    await expect(
      fetchPlayerWallet({ playerId: "p1", sid: "sid-1", fetcher })
    ).rejects.toThrow(/404/);
  });

  it("throws when the response body is malformed", async () => {
    const fetcher = mockFetcher({ ok: true, body: { foo: 1 } });
    await expect(
      fetchPlayerWallet({ playerId: "p1", sid: "sid-1", fetcher })
    ).rejects.toThrow(/unexpected wallet payload/);
  });
});
