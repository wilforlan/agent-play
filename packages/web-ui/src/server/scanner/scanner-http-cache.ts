export const buildScannerHeadEtag = (input: {
  snapshotRev: number;
  lastStreamId: string | null;
  migrationStatus: string;
}): string => {
  const stream = input.lastStreamId ?? "none";
  return `"scanner-head:${input.snapshotRev}:${stream}:${input.migrationStatus}"`;
};

export const buildAnalyticsOverviewEtag = (input: {
  eventsLast24h: number;
  lastStreamId: string | null;
  migrationStatus: string;
}): string => {
  const stream = input.lastStreamId ?? "none";
  return `"analytics-overview:${input.eventsLast24h}:${stream}:${input.migrationStatus}"`;
};

export const matchesIfNoneMatch = (
  ifNoneMatch: string | null,
  etag: string
): boolean => {
  if (ifNoneMatch === null || ifNoneMatch.length === 0) return false;
  return ifNoneMatch.split(",").some((value) => value.trim() === etag);
};

export const withScannerCacheHeaders = (
  response: Response,
  input: {
    etag: string;
    maxAgeSeconds: number;
    staleWhileRevalidateSeconds?: number;
  }
): Response => {
  const stale =
    input.staleWhileRevalidateSeconds !== undefined
      ? `, stale-while-revalidate=${input.staleWhileRevalidateSeconds}`
      : "";
  const headers = new Headers(response.headers);
  headers.set("ETag", input.etag);
  headers.set(
    "Cache-Control",
    `public, max-age=${input.maxAgeSeconds}${stale}`
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const notModifiedResponse = (etag: string): Response =>
  new Response(null, {
    status: 304,
    headers: {
      ETag: etag,
    },
  });
