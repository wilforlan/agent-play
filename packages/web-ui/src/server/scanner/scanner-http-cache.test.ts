import { describe, expect, it } from "vitest";
import {
  buildAnalyticsOverviewEtag,
  buildScannerHeadEtag,
  matchesIfNoneMatch,
  withScannerCacheHeaders,
} from "./scanner-http-cache.js";

describe("scanner-http-cache", () => {
  it("builds stable head etags from revision inputs", () => {
    const etag = buildScannerHeadEtag({
      snapshotRev: 42,
      lastStreamId: "1000-0",
      migrationStatus: "completed",
    });
    expect(etag).toBe('"scanner-head:42:1000-0:completed"');
  });

  it("builds stable analytics overview etags", () => {
    const etag = buildAnalyticsOverviewEtag({
      eventsLast24h: 10,
      lastStreamId: "2000-0",
      migrationStatus: "completed",
    });
    expect(etag).toBe('"analytics-overview:10:2000-0:completed"');
  });

  it("matches If-None-Match for exact etag", () => {
    expect(matchesIfNoneMatch('"abc"', '"abc"')).toBe(true);
    expect(matchesIfNoneMatch('"abc"', '"def"')).toBe(false);
  });

  it("applies cache-control and etag headers", () => {
    const response = Response.json({ ok: true });
    const wrapped = withScannerCacheHeaders(response, {
      etag: '"test"',
      maxAgeSeconds: 5,
      staleWhileRevalidateSeconds: 30,
    });
    expect(wrapped.headers.get("ETag")).toBe('"test"');
    expect(wrapped.headers.get("Cache-Control")).toBe(
      "public, max-age=5, stale-while-revalidate=30"
    );
  });
});
