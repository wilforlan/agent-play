import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSharedRedisClient, loadLockedApuForPlayer } = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
  loadLockedApuForPlayer: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSharedRedisClient,
}));

vi.mock("./load-locked-apu.js", () => ({
  loadLockedApuForPlayer,
}));

import { resolveClientPlayerWallet } from "./resolve-client-player-wallet.js";

describe("resolveClientPlayerWallet", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
    loadLockedApuForPlayer.mockReset();
  });

  it("returns the stored wallet when redis lookup is unavailable", async () => {
    getSharedRedisClient.mockImplementation(() => {
      throw new Error('No "getSharedRedisClient" export is defined');
    });
    const wallet = {
      playerId: "p1",
      balanceUsd: 10,
      powerUps: 1000,
      currency: "USD" as const,
      updatedAt: "2026-07-21T00:00:00.000Z",
    };
    const resolved = await resolveClientPlayerWallet({
      wallet,
      playerId: "p1",
    });
    expect(resolved.powerUps).toBe(1000);
    expect(loadLockedApuForPlayer).not.toHaveBeenCalled();
  });

  it("returns the stored wallet when redis is null", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const wallet = {
      playerId: "p1",
      balanceUsd: 10,
      powerUps: 1000,
      currency: "USD" as const,
      updatedAt: "2026-07-21T00:00:00.000Z",
    };
    const resolved = await resolveClientPlayerWallet({
      wallet,
      playerId: "p1",
    });
    expect(resolved.powerUps).toBe(1000);
    expect(loadLockedApuForPlayer).not.toHaveBeenCalled();
  });

  it("subtracts locked savings APU from powerUps for client views", async () => {
    getSharedRedisClient.mockReturnValue({ hgetall: vi.fn() });
    loadLockedApuForPlayer.mockResolvedValue(200);
    const wallet = {
      playerId: "p1",
      balanceUsd: 10,
      powerUps: 1000,
      currency: "USD" as const,
      updatedAt: "2026-07-21T00:00:00.000Z",
    };
    const resolved = await resolveClientPlayerWallet({
      wallet,
      playerId: "p1",
      hostId: "default",
    });
    expect(loadLockedApuForPlayer).toHaveBeenCalledWith({
      redis: expect.anything(),
      hostId: "default",
      playerId: "p1",
    });
    expect(resolved.powerUps).toBe(800);
  });
});
