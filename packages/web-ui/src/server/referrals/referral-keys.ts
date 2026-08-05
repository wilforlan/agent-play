export const referralOwnerKey = (hostId: string, nodeId: string): string =>
  `econext:${hostId}:referral:owner:${nodeId}`;

export const referralCodeKey = (hostId: string, code: string): string =>
  `econext:${hostId}:referral:code:${code}`;

export const referralSignupKey = (hostId: string, refereeNodeId: string): string =>
  `econext:${hostId}:referral:signup:${refereeNodeId}`;

export const referralSignupsKey = (hostId: string, referrerNodeId: string): string =>
  `econext:${hostId}:referral:signups:${referrerNodeId}`;

export const referralEarningsKey = (
  hostId: string,
  referrerNodeId: string,
  monthKey: string,
): string => `econext:${hostId}:referral:earnings:${referrerNodeId}:${monthKey}`;

export const referralClicksKey = (hostId: string, code: string): string =>
  `econext:${hostId}:referral:clicks:${code}`;

export const playerWalletKey = (hostId: string, playerId: string): string =>
  `agent-play:${hostId}:player:${playerId}:wallet`;

export const playerPurchasesKey = (hostId: string, playerId: string): string =>
  `agent-play:${hostId}:player:${playerId}:purchases`;

export const econextAccountKey = (hostId: string, nodeId: string): string =>
  `econext:${hostId}:account:${nodeId}`;

export const econextLedgerKey = (hostId: string, nodeId: string): string =>
  `econext:${hostId}:account:${nodeId}:ledger`;
