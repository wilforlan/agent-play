"use client";

import Link from "next/link";
import {
  fetchPlatformPurchases,
  type PlatformAuth,
  type PlatformSpacePurchaseRow,
} from "../platform-api";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";
import { usePlatformQuery } from "../use-platform-query";

const fetchPurchasesPage = (
  auth: PlatformAuth
): Promise<{ purchases: PlatformSpacePurchaseRow[]; generatedAt: string }> =>
  fetchPlatformPurchases(auth, { limit: 200 });

export default function PlatformPurchasesPage() {
  const { data, error, loading, reload } = usePlatformQuery({
    queryKey: "purchases",
    fetcher: fetchPurchasesPage,
  });
  const rows = data?.purchases ?? [];

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Purchases</h1>
        <p className={styles.lead}>In-amenity purchase ledger from scanner indexes.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>At</th>
                <th>Player</th>
                <th>Amenity</th>
                <th>Item</th>
                <th>USD</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>{loading ? "Loading…" : "No purchases yet."}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.at}</td>
                    <td>{row.playerId}</td>
                    <td>{row.amenityKind}</td>
                    <td>
                      {row.itemRef.kind}/{row.itemRef.id}
                    </td>
                    <td>{row.priceUsd !== null ? `$${row.priceUsd.toFixed(2)}` : "—"}</td>
                    <td>
                      <Link href={`/scanner/txs/${encodeURIComponent(row.id)}`}>
                        {row.id.slice(0, 10)}…
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformRequireAuth>
  );
}
