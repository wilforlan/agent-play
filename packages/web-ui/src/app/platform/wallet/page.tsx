"use client";

import Link from "next/link";
import { fetchSpaceWalletSummary } from "../platform-api";
import { usePlatformAuth } from "../platform-auth-context";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";
import { usePlatformQuery } from "../use-platform-query";

export default function PlatformWalletPage() {
  const { auth } = usePlatformAuth();
  const { data, error, loading, reload } = usePlatformQuery({
    queryKey: "wallet",
    fetcher: fetchSpaceWalletSummary,
  });

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Space wallet</h1>
        <p className={styles.lead}>
          Settlement wallet for <strong>{auth?.spaceName}</strong>. In-amenity purchases credit this
          wallet (owner node <code>{auth?.nodeId}</code>). Buyers still spend from their own player
          wallets in-world.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/platform/purchases" className={styles.navLink}>
            View purchases
          </Link>
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        {data !== null ? (
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Balance USD</div>
              <div className={styles.cardValue}>${data.wallet.balanceUsd.toFixed(2)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Recorded sales (scanner)</div>
              <div className={styles.cardValue}>${data.gmvUsd.toFixed(2)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Power-ups</div>
              <div className={styles.cardValue}>{data.wallet.powerUps}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Updated</div>
              <div className={styles.cardValue} style={{ fontSize: "0.75rem" }}>
                {data.wallet.updatedAt}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PlatformRequireAuth>
  );
}
