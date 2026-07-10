export const scannerKeyPrefix = (hostId: string): string =>
  `agent-play:${hostId}:scanner`;

export const scannerTxsKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:txs`;

export const scannerTxKey = (hostId: string, txId: string): string =>
  `${scannerKeyPrefix(hostId)}:tx:${txId}`;

export const scannerTxByPlayerKey = (hostId: string, playerId: string): string =>
  `${scannerKeyPrefix(hostId)}:tx:by-player:${playerId}`;

export const scannerBlocksKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:blocks`;

export const scannerWalletsKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:wallets`;

export const scannerWalletKey = (hostId: string, playerId: string): string =>
  `${scannerKeyPrefix(hostId)}:wallet:${playerId}`;

export const scannerMigrationStateKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:migration:state`;

export const playerPurchasesScanPattern = (hostId: string): string =>
  `agent-play:${hostId}:player:*:purchases`;

export const playerWalletScanPattern = (hostId: string): string =>
  `agent-play:${hostId}:player:*:wallet`;

export const playerIdFromPurchasesKey = (
  key: string,
  hostId: string
): string | null => {
  const prefix = `agent-play:${hostId}:player:`;
  const suffix = `:purchases`;
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return null;
  return key.slice(prefix.length, key.length - suffix.length);
};

export const playerIdFromWalletKey = (
  key: string,
  hostId: string
): string | null => {
  const prefix = `agent-play:${hostId}:player:`;
  const suffix = `:wallet`;
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return null;
  return key.slice(prefix.length, key.length - suffix.length);
};
