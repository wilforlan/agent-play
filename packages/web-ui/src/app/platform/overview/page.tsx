"use client";

import Link from "next/link";
import { fetchPlatformOverview } from "../platform-api";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";
import { usePlatformQuery } from "../use-platform-query";

export default function PlatformOverviewPage() {
  const { data: overview, error, loading, reload } = usePlatformQuery({
    queryKey: "overview",
    fetcher: fetchPlatformOverview,
  });

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.lead}>Purchase KPIs for your space. Revenue reconciles with Scanner txs.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/scanner?view=spaces" className={styles.navLink}>
            Open scanner
          </Link>
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        {overview !== null ? (
          <>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>GMV (all time)</div>
                <div className={styles.cardValue}>${overview.gmvUsd.toFixed(2)}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>GMV (24h)</div>
                <div className={styles.cardValue}>${overview.gmvUsd24h.toFixed(2)}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Purchases (all time)</div>
                <div className={styles.cardValue}>{overview.purchaseCount}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Purchases (24h)</div>
                <div className={styles.cardValue}>{overview.purchaseCount24h}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Items available</div>
                <div className={styles.cardValue}>{overview.itemsAvailable}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Items sold</div>
                <div className={styles.cardValue}>{overview.itemsSold}</div>
              </div>
            </div>
            <h2 className={styles.title}>By amenity</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Purchases</th>
                    <th>GMV</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.byAmenityKind.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No amenity purchases yet.</td>
                    </tr>
                  ) : (
                    overview.byAmenityKind.map((row) => (
                      <tr key={row.kind}>
                        <td>
                          <Link href={`/platform/amenities/${row.kind}`}>{row.kind}</Link>
                        </td>
                        <td>{row.purchases}</td>
                        <td>${row.gmvUsd.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </PlatformRequireAuth>
  );
}
