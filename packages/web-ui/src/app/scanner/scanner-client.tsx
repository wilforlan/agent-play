"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./scanner-page.module.css";
import {
  fetchAnalyticsEvents,
  fetchAnalyticsOverview,
  fetchScannerBlocks,
  fetchScannerHead,
  fetchScannerNodes,
  fetchScannerSpaces,
  fetchScannerTalk,
  fetchScannerTxs,
  mergeBlocksByRev,
  mergeById,
  mergeTxsById,
  searchScanner,
  txAtMs,
  type ScannerHeadResponse,
} from "./scanner-api";

type View =
  | "dashboard"
  | "txs"
  | "apu"
  | "analytics"
  | "nodes"
  | "blocks"
  | "spaces"
  | "talk"
  | "chain";

const VIEWS: View[] = [
  "dashboard",
  "txs",
  "apu",
  "analytics",
  "nodes",
  "blocks",
  "spaces",
  "talk",
];

const truncate = (value: string, len = 12): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

export function ScannerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as View | null) ?? "dashboard";
  const txId = searchParams.get("tx");
  const leafKey = searchParams.get("leaf");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [head, setHead] = useState<ScannerHeadResponse | null>(null);
  const [txs, setTxs] = useState<unknown[]>([]);
  const [nodes, setNodes] = useState<
    Array<{
      nodeId: string;
      kind: string;
      balanceUsd: number | null;
      powerUps: number | null;
    }>
  >([]);
  const [analytics, setAnalytics] = useState<{
    eventsLast24h: number;
    topEvents: Array<{ event: string; count: number }>;
    migrationStatus: string;
  } | null>(null);
  const [liveEvents, setLiveEvents] = useState<
    Array<{
      messageId: string;
      event: string;
      distinctId: string;
      timestamp: string;
      properties: Record<string, unknown>;
    }>
  >([]);
  const [blocks, setBlocks] = useState<
    Array<{
      rev: number;
      merkleRootHex: string;
      merkleLeafCount: number;
      at: string;
    }>
  >([]);
  const [spaces, setSpaces] = useState<
    Array<{ spaceId: string; txCount: number; usdVolume: number }>
  >([]);
  const [talk, setTalk] = useState<{
    sessions: number;
    totalChargedUsd: number;
    totalApuEarned: number;
  } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const headEtagRef = useRef<string | null>(null);
  const analyticsEtagRef = useRef<string | null>(null);
  const lastStreamIdRef = useRef<string | null>(null);
  const lastTxAtMsRef = useRef(0);
  const lastBlockRevRef = useRef(0);

  const setView = useCallback(
    (next: View) => {
      router.push(`/scanner?view=${next}`);
    },
    [router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headResult = await fetchScannerHead(headEtagRef.current);
      if (headResult.etag !== null) headEtagRef.current = headResult.etag;
      if (headResult.data !== null) setHead(headResult.data);

      if (view === "txs" || view === "dashboard") {
        const page = await fetchScannerTxs();
        setTxs(page.txs);
        const maxAt = page.txs.reduce<number>((max, row) => {
          const atMs = txAtMs(row as Record<string, unknown>);
          return atMs > max ? atMs : max;
        }, 0);
        lastTxAtMsRef.current = maxAt;
      }
      if (view === "apu") {
        const page = await fetchScannerTxs({ token: "APU" });
        setTxs(page.txs);
        const maxAt = page.txs.reduce<number>((max, row) => {
          const atMs = txAtMs(row as Record<string, unknown>);
          return atMs > max ? atMs : max;
        }, 0);
        lastTxAtMsRef.current = maxAt;
      }
      if (view === "nodes" || view === "dashboard") {
        const page = await fetchScannerNodes();
        setNodes(page.nodes);
      }
      if (view === "analytics" || view === "dashboard") {
        const overviewResult = await fetchAnalyticsOverview(analyticsEtagRef.current);
        if (overviewResult.etag !== null) analyticsEtagRef.current = overviewResult.etag;
        if (overviewResult.data !== null) setAnalytics(overviewResult.data);
      }
      if (view === "analytics") {
        const page = await fetchAnalyticsEvents();
        setLiveEvents(page.events);
        const streamId = page.lastStreamId ?? null;
        lastStreamIdRef.current = streamId;
      }
      if (view === "blocks" || view === "chain") {
        const page = await fetchScannerBlocks();
        setBlocks(page.blocks);
        const maxRev = page.blocks.reduce(
          (max, block) => (block.rev > max ? block.rev : max),
          0
        );
        lastBlockRevRef.current = maxRev;
      }
      if (view === "spaces") {
        const page = await fetchScannerSpaces();
        setSpaces(page.spaces);
      }
      if (view === "talk") {
        const summary = await fetchScannerTalk();
        setTalk(summary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scanner");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view !== "analytics") return;
    const poll = (): void => {
      const since = lastStreamIdRef.current;
      void fetchAnalyticsEvents(since !== null ? { since } : undefined)
        .then((page) => {
          if (page.events.length === 0) return;
          setLiveEvents((prev) => mergeById(prev, page.events, 200));
          if (page.lastStreamId !== undefined && page.lastStreamId !== null) {
            lastStreamIdRef.current = page.lastStreamId;
          }
        })
        .catch(() => undefined);
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard" && view !== "txs" && view !== "apu") return;
    const poll = (): void => {
      const sinceMs = lastTxAtMsRef.current;
      if (sinceMs <= 0) return;
      void fetchScannerTxs({
        sinceMs,
        token: view === "apu" ? "APU" : undefined,
      })
        .then((page) => {
          if (page.txs.length === 0) return;
          setTxs((prev) => mergeTxsById(prev, page.txs, 200));
          if (page.nextSinceMs !== undefined && page.nextSinceMs !== null) {
            lastTxAtMsRef.current = page.nextSinceMs;
          }
        })
        .catch(() => undefined);
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "blocks" && view !== "chain") return;
    const poll = (): void => {
      const sinceRev = lastBlockRevRef.current;
      if (sinceRev <= 0) return;
      void fetchScannerBlocks({ sinceRev })
        .then((page) => {
          if (page.blocks.length === 0) return;
          setBlocks((prev) => mergeBlocksByRev(prev, page.blocks, 200));
          if (page.nextSinceRev !== undefined && page.nextSinceRev !== null) {
            lastBlockRevRef.current = page.nextSinceRev;
          }
        })
        .catch(() => undefined);
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard") return;
    const refreshHead = (): void => {
      void fetchScannerHead(headEtagRef.current)
        .then((result) => {
          if (result.etag !== null) headEtagRef.current = result.etag;
          if (result.data !== null) setHead(result.data);
        })
        .catch(() => undefined);
    };
    const timer = window.setInterval(refreshHead, 30000);
    return () => window.clearInterval(timer);
  }, [view]);

  const headCards = useMemo(() => {
    if (head === null) return [];
    return [
      { label: "Chain rev", value: String(head.head.snapshotRev) },
      {
        label: "Merkle root",
        value: head.head.merkleRootHex
          ? truncate(head.head.merkleRootHex, 16)
          : "—",
      },
      { label: "Txs 24h", value: String(head.head.txsLast24h) },
      { label: "APU minted 24h", value: String(head.head.apuMintedLast24h) },
      { label: "APU burned 24h", value: String(head.head.apuBurnedLast24h) },
      { label: "Migration", value: head.head.migrationStatus },
    ];
  }, [head]);

  const onSearch = async (): Promise<void> => {
    if (searchQ.trim().length === 0) return;
    try {
      const result = await searchScanner(searchQ.trim());
      if (result.kind === "tx") {
        router.push(`/scanner?view=txs&tx=${encodeURIComponent(result.id)}`);
      } else if (result.kind === "node") {
        router.push(`/scanner/nodes/${encodeURIComponent(result.id)}`);
      } else {
        setError("No match found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Agent Play Scanner</h1>
            <p className={styles.subtitle}>
              Chain inspector · USD + APU ledger · in-platform analytics
            </p>
          </div>
          <nav className={styles.nav} aria-label="Scanner views">
            <Link href="/">Home</Link>
            <Link href="/stats">Stats</Link>
          </nav>
        </header>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search tx id, node id, message id"
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSearch();
            }}
          />
          <button type="button" className={styles.navBtn} onClick={() => void onSearch()}>
            Search
          </button>
        </div>

        <nav className={styles.nav} aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.navBtn} ${view === v ? styles.navBtnActive : ""}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </nav>

        {error !== null ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <p>Loading scanner…</p> : null}

        {!loading && (view === "dashboard" || view === "txs" || view === "apu") ? (
          <>
            <section className={styles.grid} aria-label="KPIs">
              {headCards.map((card) => (
                <article key={card.label} className={styles.card}>
                  <div className={styles.cardLabel}>{card.label}</div>
                  <div className={styles.cardValue}>{card.value}</div>
                </article>
              ))}
            </section>
            {txId !== null ? (
              <p>
                Selected tx: <code>{txId}</code>
              </p>
            ) : null}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>USD</th>
                  <th>APU</th>
                  <th>Node</th>
                  <th>Sources</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((row) => {
                  const tx = row as Record<string, unknown>;
                  return (
                    <tr key={String(tx.id)}>
                      <td>{String(tx.at ?? "")}</td>
                      <td>{String(tx.amenityKind ?? "")}</td>
                      <td>
                        {tx.priceUsd !== undefined ? `$${String(tx.priceUsd)}` : "—"}
                      </td>
                      <td>
                        {tx.powerUpsDelta !== undefined
                          ? String(tx.powerUpsDelta)
                          : "—"}
                      </td>
                      <td>{truncate(String(tx.playerId ?? ""))}</td>
                      <td>
                        {String(tx.debitSource ?? "—")} →{" "}
                        {String(tx.creditSource ?? "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : null}

        {!loading && view === "analytics" && analytics !== null ? (
          <>
            <section className={styles.grid}>
              <article className={styles.card}>
                <div className={styles.cardLabel}>Events 24h</div>
                <div className={styles.cardValue}>
                  {String(analytics.eventsLast24h)}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>Migration</div>
                <div className={styles.cardValue}>
                  {analytics.migrationStatus}
                </div>
              </article>
            </section>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topEvents.map((row) => (
                  <tr key={row.event}>
                    <td>{row.event}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2 className={styles.sectionTitle}>Live event stream</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {liveEvents.map((row) => (
                  <tr key={row.messageId}>
                    <td>{row.timestamp}</td>
                    <td>{row.event}</td>
                    <td>{truncate(row.distinctId, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        {!loading && view === "nodes" ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Node</th>
                <th>Kind</th>
                <th>USD</th>
                <th>APU</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((row) => (
                <tr key={row.nodeId}>
                  <td>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() =>
                        router.push(
                          `/scanner/nodes/${encodeURIComponent(row.nodeId)}`
                        )
                      }
                    >
                      {truncate(row.nodeId, 20)}
                    </button>
                  </td>
                  <td>{row.kind}</td>
                  <td>
                    {row.balanceUsd !== null ? `$${row.balanceUsd}` : "—"}
                  </td>
                  <td>{row.powerUps !== null ? row.powerUps : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && (view === "blocks" || view === "chain") ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rev</th>
                <th>Merkle</th>
                <th>Leaves</th>
                <th>At</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.rev}>
                  <td>{block.rev}</td>
                  <td>{truncate(block.merkleRootHex, 16)}</td>
                  <td>{block.merkleLeafCount}</td>
                  <td>{block.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && view === "chain" && leafKey !== null ? (
          <p>
            Leaf: <code>{leafKey}</code>
          </p>
        ) : null}

        {!loading && view === "spaces" ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Space</th>
                <th>Tx count</th>
                <th>USD volume</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr key={space.spaceId}>
                  <td>{space.spaceId}</td>
                  <td>{space.txCount}</td>
                  <td>${space.usdVolume.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && view === "talk" && talk !== null ? (
          <section className={styles.grid}>
            <article className={styles.card}>
              <div className={styles.cardLabel}>Sessions</div>
              <div className={styles.cardValue}>{talk.sessions}</div>
            </article>
            <article className={styles.card}>
              <div className={styles.cardLabel}>USD charged</div>
              <div className={styles.cardValue}>
                ${talk.totalChargedUsd.toFixed(2)}
              </div>
            </article>
            <article className={styles.card}>
              <div className={styles.cardLabel}>APU earned</div>
              <div className={styles.cardValue}>{talk.totalApuEarned}</div>
            </article>
          </section>
        ) : null}

        <footer className={styles.footer}>
          Agent Play Scanner · public read-only · APU token activity indexed
          separately from USD ledger
        </footer>
      </div>
    </div>
  );
}
