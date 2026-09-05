export type ScannerSourceCounts = {
  amenity: number;
  arcade: number;
  talk: number;
  trade: number;
  transfer: number;
  p2p: number;
  sol: number;
};

export type ScannerHeadResponse = {
  head: {
    generatedAt: string;
    hostId: string;
    snapshotRev: number;
    merkleRootHex: string | null;
    merkleLeafCount: number | null;
    sid: string | null;
    txsLast24h: number;
    apuMintedLast24h: number;
    apuBurnedLast24h: number;
    migrationStatus: string;
    txsToday: number;
    txs7d: number;
    txs30d: number;
    txs90d: number;
    txs6mo: number;
    txs1y: number;
    txs5y: number;
    txsAllTime: number;
    volumeApuToday: number;
    volumeApu7d: number;
    volumeApu30d: number;
    volumeApu90d: number;
    volumeApu6mo: number;
    volumeApu1y: number;
    volumeApu5y: number;
    volumeSolToday: number;
    volumeSol7d: number;
    volumeSol30d: number;
    volumeSol90d: number;
    volumeSol6mo: number;
    volumeSol1y: number;
    volumeSol5y: number;
    p2pSettlements7d: number;
    p2pVolumeSol7d: number;
    feeSol7d: number;
    marketCapApw: number;
    circulatingApu: number;
    escrowedApu: number;
    openP2pOrders: number;
    apwPerApu: number;
    bySource: ScannerSourceCounts;
    bySourceToday: ScannerSourceCounts;
    bySource7d: ScannerSourceCounts;
    bySource30d: ScannerSourceCounts;
    bySource90d: ScannerSourceCounts;
    bySource6mo: ScannerSourceCounts;
    bySource1y: ScannerSourceCounts;
    bySource5y: ScannerSourceCounts;
  };
  platform: {
    cards: {
      genesisNodeCount: number;
      mainNodeAccounts: number;
      agentNodeCredentials: number;
      inWorldAgentRecords: number;
    };
  };
};

export type CachedFetchResult<T> = {
  data: T | null;
  etag: string | null;
  notModified: boolean;
};

const readEtag = (res: Response): string | null => res.headers.get("ETag");

export const fetchScannerHead = async (
  etag?: string | null
): Promise<CachedFetchResult<ScannerHeadResponse>> => {
  const headers: HeadersInit = {};
  if (etag !== undefined && etag !== null && etag.length > 0) {
    headers["If-None-Match"] = etag;
  }
  const res = await fetch("/api/scanner/head", { cache: "no-store", headers });
  if (res.status === 304) {
    return { data: null, etag: readEtag(res) ?? etag ?? null, notModified: true };
  }
  if (!res.ok) throw new Error("Scanner unavailable");
  return {
    data: (await res.json()) as ScannerHeadResponse,
    etag: readEtag(res),
    notModified: false,
  };
};

export type ScannerTxListPage = {
  txs: unknown[];
  nextCursor: string | null;
  nextSinceMs?: number | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const fetchScannerTxs = async (input?: {
  cursor?: string;
  page?: number;
  sinceMs?: number;
  token?: "APU" | "USD" | "SOL";
  source?: "p2p" | "transfer" | "trade" | "sol";
}): Promise<ScannerTxListPage> => {
  const params = new URLSearchParams();
  params.set("limit", "25");
  if (input?.cursor) params.set("cursor", input.cursor);
  if (input?.page !== undefined) params.set("page", String(input.page));
  if (input?.sinceMs !== undefined) params.set("sinceMs", String(input.sinceMs));
  if (input?.token) params.set("token", input.token);
  if (input?.source) params.set("source", input.source);
  const res = await fetch(`/api/scanner/txs?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load transactions");
  return (await res.json()) as ScannerTxListPage;
};

export const fetchScannerNodes = async (): Promise<{
  nodes: Array<{
    nodeId: string;
    kind: string;
    balanceUsd: number | null;
    powerUps: number | null;
  }>;
  nextCursor: string | null;
}> => {
  const res = await fetch("/api/scanner/nodes?limit=25", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load nodes");
  return (await res.json()) as {
    nodes: Array<{
      nodeId: string;
      kind: string;
      balanceUsd: number | null;
      powerUps: number | null;
    }>;
    nextCursor: string | null;
  };
};

export const fetchAnalyticsOverview = async (
  etag?: string | null
): Promise<
  CachedFetchResult<{
    generatedAt: string;
    migrationStatus: string;
    eventsLast24h: number;
    topEvents: Array<{ event: string; count: number }>;
  }>
> => {
  const headers: HeadersInit = {};
  if (etag !== undefined && etag !== null && etag.length > 0) {
    headers["If-None-Match"] = etag;
  }
  const res = await fetch("/api/scanner/analytics/overview", {
    cache: "no-store",
    headers,
  });
  if (res.status === 304) {
    return { data: null, etag: readEtag(res) ?? etag ?? null, notModified: true };
  }
  if (!res.ok) throw new Error("Failed to load analytics");
  return {
    data: (await res.json()) as {
      generatedAt: string;
      migrationStatus: string;
      eventsLast24h: number;
      topEvents: Array<{ event: string; count: number }>;
    },
    etag: readEtag(res),
    notModified: false,
  };
};

export const fetchAnalyticsEvents = async (input?: {
  since?: string;
  cursor?: string;
}): Promise<{
  events: Array<{
    messageId: string;
    event: string;
    distinctId: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
  nextCursor: string | null;
  lastStreamId?: string | null;
}> => {
  const params = new URLSearchParams();
  params.set("limit", "20");
  if (input?.since) params.set("since", input.since);
  if (input?.cursor) params.set("cursor", input.cursor);
  const res = await fetch(`/api/scanner/analytics/events?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load analytics events");
  return (await res.json()) as {
    events: Array<{
      messageId: string;
      event: string;
      distinctId: string;
      timestamp: string;
      properties: Record<string, unknown>;
    }>;
    nextCursor: string | null;
    lastStreamId?: string | null;
  };
};

export const fetchScannerBlocks = async (input?: {
  cursor?: string;
  sinceRev?: number;
}): Promise<{
  blocks: Array<{
    rev: number;
    merkleRootHex: string;
    merkleLeafCount: number;
    at: string;
  }>;
  nextCursor: string | null;
  nextSinceRev?: number | null;
}> => {
  const params = new URLSearchParams();
  params.set("limit", "25");
  if (input?.cursor) params.set("cursor", input.cursor);
  if (input?.sinceRev !== undefined) params.set("sinceRev", String(input.sinceRev));
  const res = await fetch(`/api/scanner/blocks?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load blocks");
  return (await res.json()) as {
    blocks: Array<{
      rev: number;
      merkleRootHex: string;
      merkleLeafCount: number;
      at: string;
    }>;
    nextCursor: string | null;
    nextSinceRev?: number | null;
  };
};

export const fetchScannerSpaces = async (): Promise<{
  spaces: Array<{
    spaceId: string;
    txCount: number;
    usdVolume: number;
    apuVolume?: number;
    solVolume?: number;
  }>;
}> => {
  const res = await fetch("/api/scanner/spaces", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load spaces");
  return (await res.json()) as {
    spaces: Array<{
      spaceId: string;
      txCount: number;
      usdVolume: number;
      apuVolume?: number;
      solVolume?: number;
    }>;
  };
};

export const fetchScannerTalk = async (): Promise<{
  sessions: number;
  totalChargedUsd: number;
  totalApuEarned: number;
}> => {
  const res = await fetch("/api/scanner/talk", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load talk summary");
  return (await res.json()) as {
    sessions: number;
    totalChargedUsd: number;
    totalApuEarned: number;
  };
};

export const searchScanner = async (
  q: string
): Promise<{ kind: string; id: string }> => {
  const res = await fetch(
    `/api/scanner/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Search failed");
  return (await res.json()) as { kind: string; id: string };
};

export const txAtMs = (tx: Record<string, unknown>): number => {
  const at = tx.at;
  if (typeof at === "string") {
    const parsed = Date.parse(at);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export const mergeById = <T extends { messageId: string }>(
  existing: ReadonlyArray<T>,
  incoming: ReadonlyArray<T>,
  cap: number
): T[] => {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const row of [...incoming, ...existing]) {
    if (seen.has(row.messageId)) continue;
    seen.add(row.messageId);
    merged.push(row);
    if (merged.length >= cap) break;
  }
  return merged;
};

export const mergeTxsById = (
  existing: ReadonlyArray<unknown>,
  incoming: ReadonlyArray<unknown>,
  cap: number
): unknown[] => {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const row of [...incoming, ...existing]) {
    const tx = row as Record<string, unknown>;
    const id = String(tx.id ?? "");
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    merged.push(row);
    if (merged.length >= cap) break;
  }
  return merged;
};

export const mergeBlocksByRev = <T extends { rev: number }>(
  existing: ReadonlyArray<T>,
  incoming: ReadonlyArray<T>,
  cap: number
): T[] => {
  const seen = new Set<number>();
  const merged: T[] = [];
  for (const row of [...incoming, ...existing]) {
    if (seen.has(row.rev)) continue;
    seen.add(row.rev);
    merged.push(row);
    if (merged.length >= cap) break;
  }
  return merged;
};
