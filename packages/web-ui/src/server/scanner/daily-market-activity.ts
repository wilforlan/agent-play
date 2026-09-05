import type { ScannerTxRecord } from "@agent-play/sdk";

export const dailyMarketActivityKey = (hostId: string): string =>
  `econext:${hostId}:market:daily-activity`;

export const dailyMarketActivityRebuildKey = (hostId: string): string =>
  `econext:${hostId}:market:daily-activity:rebuild`;

export const dailyMarketActivityReadyKey = (hostId: string): string =>
  `econext:${hostId}:market:daily-activity:ready`;

export type ScannerActivitySource =
  | "amenity"
  | "arcade"
  | "talk"
  | "trade"
  | "transfer"
  | "p2p"
  | "sol";

export type ScannerActivityIncrement = {
  readonly txCount: number;
  readonly ledgerTxCount: number;
  readonly volumeApu: number;
  readonly volumeSolLamports: number;
  readonly feeSolLamports: number;
  readonly p2pDealCount: number;
  readonly usdVolume: number;
  readonly apuMinted: number;
  readonly apuBurned: number;
  readonly source: ScannerActivitySource;
};

export type DailyMarketActivityRow = {
  readonly dayStartMs: number;
  readonly volumeApu: number;
  readonly txCount: number;
  readonly ledgerTxCount: number;
  readonly volumeSolLamports: number;
  readonly feeSolLamports: number;
  readonly p2pDealCount: number;
  readonly p2pVolumeSolLamports: number;
  readonly usdVolume: number;
  readonly apuMinted: number;
  readonly apuBurned: number;
  readonly sourceCounts: Readonly<Record<ScannerActivitySource, number>>;
};

export type DailyActivityHashWriter = {
  hincrby: (key: string, field: string, increment: number) => unknown;
  hincrbyfloat: (key: string, field: string, increment: number) => unknown;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY_SOURCE_COUNTS = (): Record<ScannerActivitySource, number> => ({
  amenity: 0,
  arcade: 0,
  talk: 0,
  trade: 0,
  transfer: 0,
  p2p: 0,
  sol: 0,
});

const isApuRelatedScannerTx = (tx: ScannerTxRecord): boolean =>
  tx.token === "APU" ||
  tx.powerUpsDelta !== undefined ||
  tx.powerUpsSpent !== undefined ||
  tx.powerUpsEarned !== undefined;

const isSolRelatedScannerTx = (tx: ScannerTxRecord): boolean =>
  tx.token === "SOL" ||
  tx.amenityKind === "sol_deposit" ||
  tx.amenityKind === "sol_payout" ||
  tx.solLamportsDelta !== undefined;

export const isDuplicateVolumeCredit = (tx: ScannerTxRecord): boolean =>
  tx.amenityKind === "apu_credit" &&
  (tx.creditSource === "econext:transfer" || tx.creditSource === "econext:p2p");

export const utcDayKeyFromAt = (at: string): string => {
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return at.slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
};

export const dayStartMsFromKey = (dayKey: string): number => {
  const ms = Date.parse(`${dayKey}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : 0;
};

export const apuVolumeFromScannerTx = (tx: ScannerTxRecord): number => {
  if (tx.powerUpsDelta !== undefined) return Math.abs(tx.powerUpsDelta);
  if (tx.powerUpsSpent !== undefined) return tx.powerUpsSpent;
  if (tx.powerUpsEarned !== undefined) return tx.powerUpsEarned;
  return 0;
};

const P2P_DETAIL_SOL =
  /for (\d+) lamports \(fee (\d+)\)/;

export const p2pDealIdFromTx = (tx: ScannerTxRecord): string | null => {
  if (tx.itemRef.kind === "apu" && tx.itemRef.id.length > 0) {
    return tx.itemRef.id;
  }
  if (tx.detail === undefined) return null;
  const match = tx.detail.match(/P2P deal ([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
};

export const counterpartyFromTransferDetail = (
  tx: ScannerTxRecord,
): string | null => {
  if (tx.detail === undefined) return null;
  const match = tx.detail.match(
    /Transfer [0-9a-f-]+ (?:from|to) ([a-f0-9]{64})/i,
  );
  if (match?.[1] === undefined || match[1] === tx.playerId) return null;
  return match[1];
};

export const enrichScannerTxSolFromDetail = (
  tx: ScannerTxRecord,
): ScannerTxRecord => {
  if (tx.solLamportsDelta !== undefined) return tx;
  if (sourceFromScannerTx(tx) !== "p2p" || tx.detail === undefined) return tx;
  const match = tx.detail.match(P2P_DETAIL_SOL);
  if (match === null) return tx;
  const dealLamports = Number(match[1]);
  const feeLamports = Number(match[2]);
  if (!Number.isFinite(dealLamports) || !Number.isFinite(feeLamports)) {
    return tx;
  }
  if (tx.amenityKind === "apu_debit") {
    return {
      ...tx,
      solLamportsDelta: dealLamports - feeLamports,
      feeLamports,
    };
  }
  return { ...tx, solLamportsDelta: -dealLamports };
};

export const enrichScannerTxFromSibling = (input: {
  tx: ScannerTxRecord;
  sibling: ScannerTxRecord;
}): ScannerTxRecord => {
  const dealId = p2pDealIdFromTx(input.tx);
  const siblingDealId = p2pDealIdFromTx(input.sibling);
  if (dealId === null || dealId !== siblingDealId) return input.tx;
  if (input.sibling.playerId === input.tx.playerId) return input.tx;
  const withCounterparty =
    input.tx.counterpartyNodeId === undefined
      ? { ...input.tx, counterpartyNodeId: input.sibling.playerId }
      : input.tx;
  if (withCounterparty.solLamportsDelta !== undefined) return withCounterparty;
  const siblingSol = enrichScannerTxSolFromDetail(input.sibling);
  if (siblingSol.solLamportsDelta === undefined) return withCounterparty;
  if (withCounterparty.amenityKind === "apu_credit") {
    const dealLamports =
      siblingSol.feeLamports !== undefined
        ? Math.abs(siblingSol.solLamportsDelta) + siblingSol.feeLamports
        : Math.abs(siblingSol.solLamportsDelta);
    return { ...withCounterparty, solLamportsDelta: -dealLamports };
  }
  return {
    ...withCounterparty,
    solLamportsDelta: siblingSol.solLamportsDelta,
    feeLamports: siblingSol.feeLamports,
  };
};

export const sourceFromScannerTx = (
  tx: ScannerTxRecord,
): ScannerActivitySource => {
  if (
    tx.creditSource === "econext:p2p" ||
    tx.debitSource === "econext:p2p" ||
    tx.spaceId === "econext-p2p"
  ) {
    return "p2p";
  }
  if (
    tx.creditSource === "econext:transfer" ||
    tx.debitSource === "econext:transfer"
  ) {
    return "transfer";
  }
  if (tx.creditSource === "econext:trade") return "trade";
  if (
    tx.amenityKind === "sol_deposit" ||
    tx.amenityKind === "sol_payout" ||
    tx.creditSource === "econext:convert" ||
    tx.token === "SOL"
  ) {
    return "sol";
  }
  if (tx.amenityKind === "talk_time" || tx.amenityKind === "peer_talk_time") {
    return "talk";
  }
  if (tx.itemRef.kind === "game" || tx.spaceId === "__arcade__") return "arcade";
  return "amenity";
};

const solVolumeFromScannerTx = (tx: ScannerTxRecord): number => {
  if (isDuplicateVolumeCredit(tx)) return 0;
  const delta = Math.abs(tx.solLamportsDelta ?? 0);
  const fee = tx.feeLamports ?? 0;
  if (sourceFromScannerTx(tx) === "p2p" && tx.amenityKind === "apu_debit") {
    return delta + fee;
  }
  return delta;
};

export const activityIncrementFromScannerTx = (
  tx: ScannerTxRecord,
): ScannerActivityIncrement => {
  const apuRelated = isApuRelatedScannerTx(tx);
  const delta = tx.powerUpsDelta ?? 0;
  const source = sourceFromScannerTx(tx);
  return {
    txCount: apuRelated ? 1 : 0,
    ledgerTxCount: 1,
    volumeApu: isDuplicateVolumeCredit(tx) ? 0 : apuVolumeFromScannerTx(tx),
    volumeSolLamports: isSolRelatedScannerTx(tx)
      ? solVolumeFromScannerTx(tx)
      : 0,
    feeSolLamports:
      source === "p2p" && tx.amenityKind === "apu_debit"
        ? (tx.feeLamports ?? 0)
        : 0,
    p2pDealCount:
      source === "p2p" && tx.amenityKind === "apu_debit" ? 1 : 0,
    usdVolume: tx.priceUsd ?? 0,
    apuMinted: delta > 0 ? delta : 0,
    apuBurned:
      delta < 0 && source !== "p2p" && source !== "transfer"
        ? Math.abs(delta)
        : 0,
    source,
  };
};

const incrementField = (
  redis: DailyActivityHashWriter,
  key: string,
  field: string,
  amount: number,
  asFloat: boolean,
): void => {
  if (amount <= 0) return;
  if (asFloat) {
    redis.hincrbyfloat(key, field, amount);
    return;
  }
  redis.hincrby(key, field, amount);
};

export const queueDailyMarketActivityIncrement = (
  redis: DailyActivityHashWriter,
  input: {
    hostId: string;
    tx: ScannerTxRecord;
  },
): void => {
  const increment = activityIncrementFromScannerTx(input.tx);
  const dayKey = utcDayKeyFromAt(input.tx.at);
  const key = dailyMarketActivityKey(input.hostId);
  incrementField(redis, key, `${dayKey}:txCount`, increment.txCount, false);
  incrementField(
    redis,
    key,
    `${dayKey}:ledgerTxCount`,
    increment.ledgerTxCount,
    false,
  );
  incrementField(redis, key, `${dayKey}:volumeApu`, increment.volumeApu, true);
  incrementField(
    redis,
    key,
    `${dayKey}:volumeSolLamports`,
    increment.volumeSolLamports,
    false,
  );
  incrementField(
    redis,
    key,
    `${dayKey}:feeSolLamports`,
    increment.feeSolLamports,
    false,
  );
  incrementField(
    redis,
    key,
    `${dayKey}:p2pDealCount`,
    increment.p2pDealCount,
    false,
  );
  incrementField(
    redis,
    key,
    `${dayKey}:p2pVolumeSolLamports`,
    increment.source === "p2p" ? increment.volumeSolLamports : 0,
    false,
  );
  incrementField(redis, key, `${dayKey}:usdVolume`, increment.usdVolume, true);
  incrementField(redis, key, `${dayKey}:apuMinted`, increment.apuMinted, false);
  incrementField(redis, key, `${dayKey}:apuBurned`, increment.apuBurned, false);
  incrementField(
    redis,
    key,
    `${dayKey}:source:${increment.source}`,
    1,
    false,
  );
};

type DayAccumulator = {
  volumeApu: number;
  txCount: number;
  ledgerTxCount: number;
  volumeSolLamports: number;
  feeSolLamports: number;
  p2pDealCount: number;
  p2pVolumeSolLamports: number;
  usdVolume: number;
  apuMinted: number;
  apuBurned: number;
  sourceCounts: Record<ScannerActivitySource, number>;
};

const emptyDay = (): DayAccumulator => ({
  volumeApu: 0,
  txCount: 0,
  ledgerTxCount: 0,
  volumeSolLamports: 0,
  feeSolLamports: 0,
  p2pDealCount: 0,
  p2pVolumeSolLamports: 0,
  usdVolume: 0,
  apuMinted: 0,
  apuBurned: 0,
  sourceCounts: EMPTY_SOURCE_COUNTS(),
});

const applyMetric = (
  current: DayAccumulator,
  metric: string,
  amount: number,
): DayAccumulator => {
  if (metric === "volumeApu") return { ...current, volumeApu: amount };
  if (metric === "txCount") return { ...current, txCount: Math.trunc(amount) };
  if (metric === "ledgerTxCount") {
    return { ...current, ledgerTxCount: Math.trunc(amount) };
  }
  if (metric === "volumeSolLamports") {
    return { ...current, volumeSolLamports: Math.trunc(amount) };
  }
  if (metric === "feeSolLamports") {
    return { ...current, feeSolLamports: Math.trunc(amount) };
  }
  if (metric === "p2pDealCount") {
    return { ...current, p2pDealCount: Math.trunc(amount) };
  }
  if (metric === "p2pVolumeSolLamports") {
    return { ...current, p2pVolumeSolLamports: Math.trunc(amount) };
  }
  if (metric === "usdVolume") return { ...current, usdVolume: amount };
  if (metric === "apuMinted") {
    return { ...current, apuMinted: Math.trunc(amount) };
  }
  if (metric === "apuBurned") {
    return { ...current, apuBurned: Math.trunc(amount) };
  }
  if (metric.startsWith("source:")) {
    const source = metric.slice("source:".length) as ScannerActivitySource;
    if (source in current.sourceCounts) {
      return {
        ...current,
        sourceCounts: {
          ...current.sourceCounts,
          [source]: Math.trunc(amount),
        },
      };
    }
  }
  return current;
};

export const parseDailyMarketActivityHash = (input: {
  raw: Record<string, string>;
  sinceMs: number;
}): readonly DailyMarketActivityRow[] => {
  const byDay = new Map<string, DayAccumulator>();
  for (const [field, value] of Object.entries(input.raw)) {
    const dayKey = field.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue;
    const metric = field.slice(11);
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const current = byDay.get(dayKey) ?? emptyDay();
    byDay.set(dayKey, applyMetric(current, metric, amount));
  }

  return [...byDay.entries()]
    .map(([dayKey, row]) => ({
      dayStartMs: dayStartMsFromKey(dayKey),
      volumeApu: row.volumeApu,
      txCount: row.txCount,
      ledgerTxCount: row.ledgerTxCount,
      volumeSolLamports: row.volumeSolLamports,
      feeSolLamports: row.feeSolLamports,
      p2pDealCount: row.p2pDealCount,
      p2pVolumeSolLamports: row.p2pVolumeSolLamports,
      usdVolume: row.usdVolume,
      apuMinted: row.apuMinted,
      apuBurned: row.apuBurned,
      sourceCounts: row.sourceCounts,
    }))
    .filter((row) => row.dayStartMs + DAY_MS - 1 >= input.sinceMs)
    .sort((a, b) => a.dayStartMs - b.dayStartMs);
};

export const ledgerTxsFromDay = (row: {
  readonly ledgerTxCount: number;
  readonly txCount: number;
}): number => (row.ledgerTxCount > 0 ? row.ledgerTxCount : row.txCount);

export const summarizeDailyActivityRows = (
  rows: readonly DailyMarketActivityRow[],
): {
  readonly txCount: number;
  readonly ledgerTxCount: number;
  readonly volumeApu: number;
  readonly volumeSolLamports: number;
  readonly feeSolLamports: number;
  readonly p2pDealCount: number;
  readonly p2pVolumeSolLamports: number;
  readonly apuMinted: number;
  readonly apuBurned: number;
  readonly sourceCounts: Readonly<Record<ScannerActivitySource, number>>;
} => {
  const sourceCounts = EMPTY_SOURCE_COUNTS();
  let txCount = 0;
  let ledgerTxCount = 0;
  let volumeApu = 0;
  let volumeSolLamports = 0;
  let feeSolLamports = 0;
  let p2pDealCount = 0;
  let p2pVolumeSolLamports = 0;
  let apuMinted = 0;
  let apuBurned = 0;
  for (const row of rows) {
    txCount += row.txCount;
    ledgerTxCount += row.ledgerTxCount;
    volumeApu += row.volumeApu;
    volumeSolLamports += row.volumeSolLamports;
    feeSolLamports += row.feeSolLamports;
    p2pDealCount += row.p2pDealCount;
    p2pVolumeSolLamports += row.p2pVolumeSolLamports;
    apuMinted += row.apuMinted;
    apuBurned += row.apuBurned;
    for (const source of Object.keys(sourceCounts) as ScannerActivitySource[]) {
      sourceCounts[source] += row.sourceCounts[source];
    }
  }
  return {
    txCount,
    ledgerTxCount,
    volumeApu,
    volumeSolLamports,
    feeSolLamports,
    p2pDealCount,
    p2pVolumeSolLamports,
    apuMinted,
    apuBurned,
    sourceCounts,
  };
};

export const aggregateDailyMarketActivity = (
  txs: readonly ScannerTxRecord[],
): Record<string, string> => {
  const fields: Record<string, DayAccumulator> = {};
  for (const tx of txs) {
    const increment = activityIncrementFromScannerTx(tx);
    const dayKey = utcDayKeyFromAt(tx.at);
    const current = fields[dayKey] ?? emptyDay();
    fields[dayKey] = {
      volumeApu: current.volumeApu + increment.volumeApu,
      txCount: current.txCount + increment.txCount,
      ledgerTxCount: current.ledgerTxCount + increment.ledgerTxCount,
      volumeSolLamports: current.volumeSolLamports + increment.volumeSolLamports,
      feeSolLamports: current.feeSolLamports + increment.feeSolLamports,
      p2pDealCount: current.p2pDealCount + increment.p2pDealCount,
      p2pVolumeSolLamports:
        current.p2pVolumeSolLamports +
        (increment.source === "p2p" ? increment.volumeSolLamports : 0),
      usdVolume: current.usdVolume + increment.usdVolume,
      apuMinted: current.apuMinted + increment.apuMinted,
      apuBurned: current.apuBurned + increment.apuBurned,
      sourceCounts: {
        ...current.sourceCounts,
        [increment.source]: current.sourceCounts[increment.source] + 1,
      },
    };
  }

  const raw: Record<string, string> = {};
  for (const [dayKey, row] of Object.entries(fields)) {
    raw[`${dayKey}:txCount`] = String(row.txCount);
    raw[`${dayKey}:ledgerTxCount`] = String(row.ledgerTxCount);
    raw[`${dayKey}:volumeApu`] = String(row.volumeApu);
    raw[`${dayKey}:volumeSolLamports`] = String(row.volumeSolLamports);
    raw[`${dayKey}:feeSolLamports`] = String(row.feeSolLamports);
    raw[`${dayKey}:p2pDealCount`] = String(row.p2pDealCount);
    raw[`${dayKey}:p2pVolumeSolLamports`] = String(row.p2pVolumeSolLamports);
    raw[`${dayKey}:usdVolume`] = String(row.usdVolume);
    raw[`${dayKey}:apuMinted`] = String(row.apuMinted);
    raw[`${dayKey}:apuBurned`] = String(row.apuBurned);
    for (const [source, count] of Object.entries(row.sourceCounts)) {
      if (count > 0) {
        raw[`${dayKey}:source:${source}`] = String(count);
      }
    }
  }
  return raw;
};

export const filterDailyActivitySince = (input: {
  rows: readonly DailyMarketActivityRow[];
  sinceMs: number;
  untilMs?: number;
}): readonly DailyMarketActivityRow[] => {
  const untilMs = input.untilMs ?? Number.POSITIVE_INFINITY;
  return input.rows.filter((row) => {
    const dayEndMs = row.dayStartMs + DAY_MS - 1;
    return dayEndMs >= input.sinceMs && row.dayStartMs <= untilMs;
  });
};
