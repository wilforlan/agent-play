"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScannerNodeProfile } from "@agent-play/sdk";
import styles from "../../scanner-page.module.css";
import { fetchScannerNodeProfile } from "../../scanner-node-api";

const truncate = (value: string, len = 12): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

export function ScannerNodeClient() {
  const params = useParams();
  const nodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ScannerNodeProfile | null>(null);

  const load = useCallback(async () => {
    if (nodeId.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScannerNodeProfile(nodeId);
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load node");
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Node profile</h1>
            <p className={styles.subtitle}>
              <code>{truncate(nodeId, 24)}</code>
              {profile !== null ? (
                <span> · {profile.kind}</span>
              ) : null}
            </p>
          </div>
          <nav className={styles.nav} aria-label="Scanner navigation">
            <Link href="/scanner?view=nodes">← Nodes</Link>
            <Link href="/scanner">Scanner</Link>
          </nav>
        </header>

        {error !== null ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <p>Loading node profile…</p> : null}

        {!loading && profile !== null ? (
          <>
            <section className={styles.grid} aria-label="Ledger KPIs">
              <article className={styles.card}>
                <div className={styles.cardLabel}>Transactions</div>
                <div className={styles.cardValue}>
                  {String(profile.ledger.txCount)}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>USD spent</div>
                <div className={styles.cardValue}>
                  ${profile.ledger.usdSpent.toFixed(2)}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>APU minted</div>
                <div className={styles.cardValue}>
                  {String(profile.ledger.apuMinted)}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>APU burned</div>
                <div className={styles.cardValue}>
                  {String(profile.ledger.apuBurned)}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>Events 24h</div>
                <div className={styles.cardValue}>
                  {String(profile.analytics.eventsLast24h)}
                </div>
              </article>
            </section>

            <h2 className={styles.sectionTitle}>Breakdown by amenity</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Amenity</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profile.breakdown.byAmenityKind).map(
                  ([kind, count]) => (
                    <tr key={kind}>
                      <td>{kind}</td>
                      <td>{count}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

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
                      <code>
                        {JSON.stringify(event.properties).slice(0, 80)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {profile.gameStats !== null ? (
              <>
                <h2 className={styles.sectionTitle}>Game stats</h2>
                <section className={styles.grid}>
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
