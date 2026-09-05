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

export const scannerSupplyKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:supply`;

export const scannerSpaceCacheKey = (hostId: string, spaceId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:space:${spaceId}`;

export const scannerTalkCacheKey = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:talk`;

export const scannerGameCacheKey = (hostId: string, gameId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:game:${gameId}`;

export const scannerSpaceScanPattern = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:space:*`;

export const scannerGameScanPattern = (hostId: string): string =>
  `${scannerKeyPrefix(hostId)}:cache:game:*`;

export const p2pEscrowedApuTotalKey = (hostId: string): string =>
  `econext-p2p:${hostId}:escrow:apu:total`;

export const p2pOpenOrdersKey = (hostId: string): string =>
  `econext-p2p:${hostId}:orders:open`;

export const marketCapCacheKey = (hostId: string): string =>
  `econext:${hostId}:market:apw-cap`;

export const marketCapSnapshotsKey = (hostId: string): string =>
  `econext:${hostId}:market-cap:snapshots`;

export const apwPerApuRateKey = (hostId: string): string =>
  `econext:${hostId}:market:apw-per-apu`;

export const playerWalletKey = (hostId: string, nodeId: string): string =>
  `agent-play:${hostId}:player:${nodeId}:wallet`;

export const econextAccountKey = (hostId: string, nodeId: string): string =>
  `econext:${hostId}:account:${nodeId}`;

export const econextAccountScanPattern = (hostId: string): string =>
  `econext:${hostId}:account:*`;

export const solanaWalletKey = (hostId: string, nodeId: string): string =>
  `econext:${hostId}:account:${nodeId}:solana-wallet`;

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
