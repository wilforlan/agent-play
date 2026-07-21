import { describe, expect, it, vi } from "vitest";
import { loadLockedApuForPlayer } from "./load-locked-apu.js";

describe("loadLockedApuForPlayer", () => {
  it("reads econext vault hash and sums active locks", async () => {
    const hgetall = vi.fn(async () => ({
      "vault-1": JSON.stringify({ status: "active", lockedApu: 200 }),
      "vault-2": JSON.stringify({ status: "closed", lockedApu: 100 }),
    }));
    const locked = await loadLockedApuForPlayer({
      redis: { hgetall },
      hostId: "default",
      playerId: "node-a",
    });
    expect(hgetall).toHaveBeenCalledWith("econext:default:account:node-a:vaults");
    expect(locked).toBe(200);
  });

  it("returns 0 when the vault hash is empty", async () => {
    const locked = await loadLockedApuForPlayer({
      redis: { hgetall: vi.fn(async () => ({})) },
      hostId: "default",
      playerId: "node-a",
    });
    expect(locked).toBe(0);
  });
});
