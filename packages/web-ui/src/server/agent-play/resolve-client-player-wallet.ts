import type { PlayerWallet } from "@agent-play/sdk";
import { getSharedRedisClient } from "@/server/get-world";
import { loadLockedApuForPlayer } from "./load-locked-apu.js";
import { toSpendablePlayerWallet } from "./spendable-wallet-power-ups.js";

const readSharedRedisOrNull = (): {
  hgetall(key: string): Promise<Record<string, string>>;
} | null => {
  try {
    return getSharedRedisClient();
  } catch {
    return null;
  }
};

export const resolveClientPlayerWallet = async (input: {
  wallet: PlayerWallet;
  playerId: string;
  hostId?: string;
}): Promise<PlayerWallet> => {
  const redis = readSharedRedisOrNull();
  if (redis === null) {
    return input.wallet;
  }
  const hostId = input.hostId ?? process.env.AGENT_PLAY_HOST_ID ?? "default";
  const lockedApu = await loadLockedApuForPlayer({
    redis,
    hostId,
    playerId: input.playerId,
  });
  return toSpendablePlayerWallet({ wallet: input.wallet, lockedApu });
};
