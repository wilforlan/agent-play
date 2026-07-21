import {
  econextAccountVaultsKey,
  sumActiveLockedApuFromVaultHashValues,
} from "./spendable-wallet-power-ups.js";

type RedisHgetall = {
  hgetall(key: string): Promise<Record<string, string>>;
};

export const loadLockedApuForPlayer = async (input: {
  redis: RedisHgetall;
  hostId: string;
  playerId: string;
}): Promise<number> => {
  const hash = await input.redis.hgetall(
    econextAccountVaultsKey(input.hostId, input.playerId)
  );
  return sumActiveLockedApuFromVaultHashValues(Object.values(hash));
};
