"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScannerNodeProfile } from "@agent-play/sdk";
import styles from "../../scanner-page.module.css";
import {
  fetchScannerNodeProfile,
  fetchScannerNodeTxs,
} from "../../scanner-node-api";
import { ScannerPagination } from "../../scanner-pagination";

const truncate = (value: string, len = 12): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

export function ScannerNodeClient() {
  const params = useParams();
  const nodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ScannerNodeProfile | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txPageCount, setTxPageCount] = useState(0);

  const load = useCallback(async () => {
    if (nodeId.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScannerNodeProfile(nodeId);
      const txPageResult = await fetchScannerNodeTxs({
        nodeId,
        page: 1,
      });
      setProfile({
        ...data,
        txs: txPageResult.txs,
      });
      setTxPageCount(txPageResult.pageCount);
      setTxPage(txPageResult.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load node");
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadTxPage = useCallback(
    async (page: number) => {
      if (nodeId.length === 0) return;
      try {
        const txPageResult = await fetchScannerNodeTxs({
          nodeId,
          page,
        });
        setProfile((current) =>
          current === null
            ? current
            : { ...current, txs: txPageResult.txs },
        );
        setTxPageCount(txPageResult.pageCount);
        setTxPage(txPageResult.page);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load node");
      }
    },
    [nodeId],
  );

  const amenityEntries = profile === null
    ? []
    : Object.entries(profile.breakdown.byAmenityKind);
  const amenityMax = amenityEntries.reduce(
    (max, [, count]) => (count > max ? count : max),
    0,
  );

  return (
    <div className={styles.page} data-scanner="true">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <h1 className={styles.title}>Node profile</h1>
            <p className={styles.subtitle}>
              <code>{truncate(nodeId, 24)}</code>
              {profile !== null ? (
                <span> · {profile.kind}</span>
              ) : null}
            </p>
          </div>
          <nav className={styles.nav} aria-label="Scanner navigation">
            <Link href="/scanner?view=nodes">Nodes</Link>
            <Link href="/scanner">Scanner</Link>
          </nav>
        </header>

        {error !== null ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <>
            <div className={styles.skeletonGrid} aria-hidden="true">
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
            <div className={styles.skeletonRow} />
          </>
        ) : null}

        {!loading && profile !== null ? (
          <>
            <section className={styles.receiptHero} aria-label="Wallet">
              <article className={styles.card}>
                <div className={styles.cardLabel}>USD</div>
                <div className={styles.cardValue}>
                  {`$${profile.ledger.apwVolume.toFixed(2)}`}
                </div>
                <div className={styles.cardHint}>
                  {profile.ledger.txCount} txs · APW$
                  {profile.ledger.apwVolume.toFixed(2)} transacted
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>APU</div>
                <div className={styles.cardValue}>
                  {profile.wallet !== null
                    ? profile.wallet.powerUps
                    : profile.ledger.apuMinted > 0
                      ? profile.ledger.apuMinted
                      : "—"}
                </div>
                <div className={styles.cardHint}>
                  {profile.ledger.apuMinted} minted · {profile.ledger.apuBurned} burned
                </div>
              </article>
            </section>

            <h2 className={styles.sectionTitle}>Amenity breakdown</h2>
            <div className={styles.barList}>
              {amenityEntries.map(([kind, count]) => (
                <div key={kind} className={styles.barRow}>
                  <span>{kind}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${amenityMax > 0 ? (count / amenityMax) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span>{count}</span>
                </div>
              ))}
            </div>

            <h2 className={styles.sectionTitle}>Transactions</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>USD</th>
                  <th>APU</th>
                  <th>Space</th>
                </tr>
              </thead>
              <tbody>
                {profile.txs.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <Link href={`/scanner/txs/${encodeURIComponent(tx.id)}`}>{tx.at}</Link>
                    </td>
                    <td>{tx.amenityKind}</td>
                    <td>
                      {tx.priceUsd !== undefined ? `$${tx.priceUsd}` : "—"}
                    </td>
                    <td>
                      {tx.powerUpsDelta !== undefined
                        ? String(tx.powerUpsDelta)
                        : "—"}
                    </td>
                    <td>{tx.spaceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ScannerPagination
              page={txPage}
              pageCount={txPageCount}
              onPageChange={(page) => void loadTxPage(page)}
            />

            <h2 className={styles.sectionTitle}>Analytics timeline</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Properties</th>
                </tr>
              </thead>
              <tbody>
                {profile.analyticsEvents.map((event) => (
                  <tr key={event.messageId}>
                    <td>{event.timestamp}</td>
                    <td>{event.event}</td>
                    <td>
                      <details className={styles.jsonFold}>
                        <summary>Properties</summary>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() =>
                            void navigator.clipboard?.writeText(
                              JSON.stringify(event.properties, null, 2),
                            )
                          }
                        >
                          Copy
                        </button>
                        <pre className={styles.jsonPre}>
                          {JSON.stringify(event.properties, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {profile.gameStats !== null ? (
              <>
                <h2 className={styles.sectionTitle}>Game stats</h2>
                <section className={styles.hero}>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>Day streak</div>
                    <div className={styles.cardValue}>
                      {profile.gameStats.dayStreak}
                    </div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>Best streak</div>
                    <div className={styles.cardValue}>
                      {profile.gameStats.bestStreak}
                    </div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>Games today</div>
                    <div className={styles.cardValue}>
                      {profile.gameStats.gamesPlayedToday}
                    </div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>Featured game</div>
                    <div className={styles.cardValue}>
                      {profile.gameStats.featuredGameId}
                    </div>
                  </article>
                </section>
              </>
            ) : null}
          </>
        ) : null}

        <footer className={styles.footer}>
          Public node analytics · no session secrets or PII
        </footer>
      </div>
    </div>
  );
}
