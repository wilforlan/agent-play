"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
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
import { ScannerPagination } from "./scanner-pagination";

type View =
  | "dashboard"
  | "txs"
  | "apu"
  | "analytics"
  | "nodes"
  | "blocks"
  | "spaces"
  | "talk";

type Range = "today" | "7d" | "30d" | "90d" | "6mo" | "1y" | "5y";
type TapeFilter = "all" | "APU" | "SOL" | "USD" | "P2P";

const RANGE_CHIPS: ReadonlyArray<{ id: Range; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
];

const TabIcon = (input: { name: View }): ReactElement => {
  const common = {
    className: styles.tabIcon,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    "aria-hidden": true as const,
  };
  if (input.name === "dashboard") {
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="5.5" height="5.5" />
        <rect x="9" y="1.5" width="5.5" height="5.5" />
        <rect x="1.5" y="9" width="5.5" height="5.5" />
        <rect x="9" y="9" width="5.5" height="5.5" />
      </svg>
    );
  }
  if (input.name === "txs") {
    return (
      <svg {...common}>
        <path d="M3 4h10M3 8h10M3 12h7" />
      </svg>
    );
  }
  if (input.name === "nodes") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="2" />
        <circle cx="3.2" cy="4" r="1.4" />
        <circle cx="12.8" cy="4" r="1.4" />
        <circle cx="3.2" cy="12" r="1.4" />
        <circle cx="12.8" cy="12" r="1.4" />
        <path d="M4.4 4.8 6.4 6.6M11.6 4.8 9.6 6.6M4.4 11.2 6.4 9.4M11.6 11.2 9.6 9.4" />
      </svg>
    );
  }
  if (input.name === "spaces") {
    return (
      <svg {...common}>
        <path d="M2.5 12.5 8 2.8l5.5 9.7z" />
      </svg>
    );
  }
  if (input.name === "talk") {
    return (
      <svg {...common}>
        <path d="M3 3.5h10v7H7L4 13v-2.5H3z" />
      </svg>
    );
  }
  if (input.name === "blocks") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="5" height="5" />
        <rect x="9" y="2" width="5" height="5" />
        <rect x="2" y="9" width="5" height="5" />
        <rect x="9" y="9" width="5" height="5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M2.5 11.5 6 7.5l2.5 2.5 5-6" />
    </svg>
  );
};

const TAB_GROUPS: ReadonlyArray<{
  label: string;
  views: ReadonlyArray<{ id: View; label: string }>;
}> = [
  {
    label: "Ledger",
    views: [
      { id: "dashboard", label: "Overview" },
      { id: "txs", label: "Transactions" },
    ],
  },
  {
    label: "World",
    views: [
      { id: "nodes", label: "Nodes" },
      { id: "spaces", label: "Spaces" },
      { id: "talk", label: "Talk" },
    ],
  },
  {
    label: "Chain",
    views: [
      { id: "blocks", label: "Blocks" },
      { id: "analytics", label: "Analytics" },
    ],
  },
];

const rangeKpis = (
  head: ScannerHeadResponse["head"],
  range: Range,
): {
  txs: number;
  apu: number;
  sol: number;
  sources: ScannerHeadResponse["head"]["bySource"];
} => {
  if (range === "today") {
    return {
      txs: head.txsToday,
      apu: head.volumeApuToday,
      sol: head.volumeSolToday,
      sources: head.bySourceToday,
    };
  }
  if (range === "7d") {
    return {
      txs: head.txs7d,
      apu: head.volumeApu7d,
      sol: head.volumeSol7d,
      sources: head.bySource7d,
    };
  }
  if (range === "30d") {
    return {
      txs: head.txs30d,
      apu: head.volumeApu30d,
      sol: head.volumeSol30d,
      sources: head.bySource30d,
    };
  }
  if (range === "90d") {
    return {
      txs: head.txs90d,
      apu: head.volumeApu90d,
      sol: head.volumeSol90d,
      sources: head.bySource90d,
    };
  }
  if (range === "6mo") {
    return {
      txs: head.txs6mo,
      apu: head.volumeApu6mo,
      sol: head.volumeSol6mo,
      sources: head.bySource6mo,
    };
  }
  if (range === "1y") {
    return {
      txs: head.txs1y,
      apu: head.volumeApu1y,
      sol: head.volumeSol1y,
      sources: head.bySource1y,
    };
  }
  return {
    txs: head.txs5y,
    apu: head.volumeApu5y,
    sol: head.volumeSol5y,
    sources: head.bySource5y,
  };
};

const LAMPORTS_PER_SOL = 1_000_000_000;

const truncate = (value: string, len = 12): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

const asTx = (row: unknown): Record<string, unknown> =>
  row as Record<string, unknown>;

const kindFromTx = (tx: Record<string, unknown>): string => {
  const credit = String(tx.creditSource ?? "");
  const spaceId = String(tx.spaceId ?? "");
  const amenity = String(tx.amenityKind ?? "");
  if (credit === "econext:p2p" || spaceId === "econext-p2p") return "P2P";
  if (credit === "econext:transfer") return "Transfer";
  if (credit === "econext:trade") return "Trade";
  if (credit === "econext:convert") return "Convert";
  if (amenity === "sol_deposit") return "SOL in";
  if (amenity === "sol_payout") return "SOL out";
  if (amenity === "talk_time" || amenity === "peer_talk_time") return "Talk";
  if (tx.itemRef !== undefined && asTx(tx.itemRef).kind === "game") {
    return "Arcade";
  }
  if (spaceId === "__arcade__") return "Arcade";
  return "Shop";
};

const kindClass = (kind: string): string => {
  if (kind === "P2P") return `${styles.kind} ${styles.kindP2p}`;
  if (kind === "SOL in") return `${styles.kind} ${styles.kindSolIn}`;
  if (kind === "SOL out") return `${styles.kind} ${styles.kindSolOut}`;
  if (kind === "Transfer" || kind === "Trade" || kind === "Convert") {
    return `${styles.kind} ${styles.kindTransfer}`;
  }
  return styles.kind;
};

const formatSol = (lamports: unknown): string => {
  if (typeof lamports !== "number" || !Number.isFinite(lamports)) return "—";
  const signed = lamports / LAMPORTS_PER_SOL;
  const abs = Math.abs(signed);
  const digits = abs >= 1 ? 4 : 6;
  const text = `${signed < 0 ? "−" : signed > 0 ? "+" : ""}${abs.toFixed(digits)}`;
  return `${text} SOL`;
};

const formatUsd = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
};

const formatApu = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value)}`;
};

const signedClass = (value: unknown): string | undefined => {
  if (typeof value !== "number") return undefined;
  if (value > 0) return styles.signedPos;
  if (value < 0) return styles.signedNeg;
  return undefined;
};

const relativeTime = (iso: string, nowMs: number): string => {
  const atMs = Date.parse(iso);
  if (!Number.isFinite(atMs)) return iso;
  const deltaSec = Math.max(0, Math.round((nowMs - atMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.round(deltaMin / 60);
  if (deltaHr < 48) return `${deltaHr}h ago`;
  const deltaDay = Math.round(deltaHr / 24);
  return `${deltaDay}d ago`;
};

const copyText = async (value: string): Promise<void> => {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    return;
  }
  await navigator.clipboard.writeText(value);
};

export function ScannerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as View | null) ?? "dashboard";
  const txId = searchParams.get("tx");
  const leafKey = searchParams.get("leaf");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [range, setRange] = useState<Range>("today");
  const [tapeFilter, setTapeFilter] = useState<TapeFilter>("all");
  const [txPage, setTxPage] = useState(1);
  const [txPageCount, setTxPageCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [head, setHead] = useState<ScannerHeadResponse | null>(null);
  const [txs, setTxs] = useState<unknown[]>([]);
  const [newTxIds, setNewTxIds] = useState<ReadonlySet<string>>(new Set());
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
    Array<{
      spaceId: string;
      txCount: number;
      usdVolume: number;
      apuVolume?: number;
      solVolume?: number;
    }>
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
  const paintedRef = useRef(false);

  const setView = useCallback(
    (next: View) => {
      router.push(`/scanner?view=${next}`);
    },
    [router]
  );

  useEffect(() => {
    if (txId !== null && txId.length > 0 && view === "txs") {
      router.replace(`/scanner/txs/${encodeURIComponent(txId)}`);
    }
  }, [txId, view, router]);

  const txQuery = useMemo(() => {
    if (tapeFilter === "APU") return { token: "APU" as const };
    if (tapeFilter === "SOL") return { token: "SOL" as const };
    if (tapeFilter === "USD") return { token: "USD" as const };
    if (tapeFilter === "P2P") return { source: "p2p" as const };
    return {};
  }, [tapeFilter]);

  const loadTape = useCallback(async () => {
    if (view !== "txs" && view !== "dashboard") return;
    const page = await fetchScannerTxs({ ...txQuery, page: txPage });
    setTxs(page.txs);
    setTxPageCount(page.pageCount);
    if (page.page !== txPage) setTxPage(page.page);
    const maxAt = page.txs.reduce<number>((max, row) => {
      const atMs = txAtMs(row as Record<string, unknown>);
      return atMs > max ? atMs : max;
    }, 0);
    lastTxAtMsRef.current = maxAt;
  }, [view, txQuery, txPage]);

  const load = useCallback(async () => {
    if (!paintedRef.current) setLoading(true);
    setError(null);
    try {
      const headResult = await fetchScannerHead(headEtagRef.current);
      if (headResult.etag !== null) headEtagRef.current = headResult.etag;
      if (headResult.data !== null) setHead(headResult.data);

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
      if (view === "blocks") {
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
      setLive(true);
    } catch (e) {
      setLive(false);
      setError(e instanceof Error ? e.message : "Failed to load scanner");
    } finally {
      setLoading(false);
      paintedRef.current = true;
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view !== "txs" && view !== "dashboard") return;
    void loadTape().catch(() => setLive(false));
  }, [loadTape, view]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view !== "analytics") return;
    const poll = (): void => {
      const since = lastStreamIdRef.current;
      void fetchAnalyticsEvents(since !== null ? { since } : undefined)
        .then((page) => {
          setLive(true);
          if (page.events.length === 0) return;
          setLiveEvents((prev) => mergeById(prev, page.events, 200));
          if (page.lastStreamId !== undefined && page.lastStreamId !== null) {
            lastStreamIdRef.current = page.lastStreamId;
          }
        })
        .catch(() => setLive(false));
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard" && view !== "txs") return;
    if (txPage !== 1) return;
    const poll = (): void => {
      const sinceMs = lastTxAtMsRef.current;
      if (sinceMs <= 0) return;
      void fetchScannerTxs({
        sinceMs,
        ...txQuery,
      })
        .then((page) => {
          setLive(true);
          if (page.txs.length === 0) return;
          const incomingIds = new Set(
            page.txs.map((row) => String(asTx(row).id ?? "")).filter((id) => id.length > 0)
          );
          setNewTxIds(incomingIds);
          setTxs((prev) => mergeTxsById(prev, page.txs, 200));
          if (page.nextSinceMs !== undefined && page.nextSinceMs !== null) {
            lastTxAtMsRef.current = page.nextSinceMs;
          }
        })
        .catch(() => setLive(false));
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view, txQuery, txPage]);

  useEffect(() => {
    if (view !== "blocks") return;
    const poll = (): void => {
      const sinceRev = lastBlockRevRef.current;
      if (sinceRev <= 0) return;
      void fetchScannerBlocks({ sinceRev })
        .then((page) => {
          setLive(true);
          if (page.blocks.length === 0) return;
          setBlocks((prev) => mergeBlocksByRev(prev, page.blocks, 200));
          if (page.nextSinceRev !== undefined && page.nextSinceRev !== null) {
            lastBlockRevRef.current = page.nextSinceRev;
          }
        })
        .catch(() => setLive(false));
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard") return;
    const refreshHead = (): void => {
      void fetchScannerHead(headEtagRef.current)
        .then((result) => {
          setLive(true);
          if (result.etag !== null) headEtagRef.current = result.etag;
          if (result.data !== null) setHead(result.data);
        })
        .catch(() => setLive(false));
    };
    const timer = window.setInterval(refreshHead, 30000);
    return () => window.clearInterval(timer);
  }, [view]);

  const selected = useMemo(
    () => (head === null ? null : rangeKpis(head.head, range)),
    [head, range],
  );

  const hero = useMemo(() => {
    if (head === null || selected === null) return [];
    const h = head.head;
    const rangeLabel =
      RANGE_CHIPS.find((chip) => chip.id === range)?.label ?? range;
    return [
      {
        label: "Txs",
        value: String(selected.txs),
        hint: `${rangeLabel} · ${h.txsAllTime} all-time`,
      },
      {
        label: "APU volume",
        value: String(selected.apu),
        hint: `${rangeLabel} ledger volume`,
      },
      {
        label: "SOL transacted",
        value: formatSol(selected.sol).replace(/^[+−]/, ""),
        hint: `${rangeLabel} SOL volume`,
      },
      {
        label: "APW$ cap",
        value: formatUsd(h.marketCapApw),
        hint: `${h.txsAllTime} all-time txs`,
      },
    ];
  }, [head, range, selected]);

  const onSearch = async (): Promise<void> => {
    if (searchQ.trim().length === 0) return;
    try {
      const result = await searchScanner(searchQ.trim());
      if (result.kind === "tx") {
        router.push(`/scanner/txs/${encodeURIComponent(result.id)}`);
      } else if (result.kind === "node") {
        router.push(`/scanner/nodes/${encodeURIComponent(result.id)}`);
      } else {
        setError("No match found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  const showTape = view === "dashboard" || view === "txs";
  const firstPaint = loading && head === null;

  return (
    <div className={styles.page} data-scanner="true">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <h1 className={styles.title}>Agent Play Scanner</h1>
            <p className={styles.subtitle}>
              Public ledger explorer for Agent Play World
            </p>
            <div
              className={`${styles.liveChip} ${live ? styles.liveChipOn : ""}`}
            >
              <span className={styles.liveDot} aria-hidden="true" />
              {live ? "Live" : "Idle"}
            </div>
          </div>
          <nav className={styles.nav} aria-label="Scanner views">
            <Link href="/">Home</Link>
            <Link href="/stats">Stats</Link>
          </nav>
        </header>

        {head !== null ? (
          <p className={styles.statusLine}>
            <span>rev {head.head.snapshotRev}</span>
            <span>
              merkle{" "}
              {head.head.merkleRootHex
                ? truncate(head.head.merkleRootHex, 16)
                : "—"}
            </span>
            {head.head.merkleRootHex !== null ? (
              <button
                type="button"
                onClick={() => void copyText(head.head.merkleRootHex ?? "")}
              >
                Copy
              </button>
            ) : null}
            <span>index {head.head.migrationStatus}</span>
          </p>
        ) : null}

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Transaction, node, or message id"
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSearch();
            }}
          />
        </div>

        <div className={styles.tabGroups}>
          {TAB_GROUPS.map((group) => (
            <div key={group.label} className={styles.tabGroup}>
              <div className={styles.tabGroupLabel}>{group.label}</div>
              <nav className={styles.tabNav} aria-label={group.label}>
                {group.views.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.tabBtn} ${view === item.id ? styles.tabBtnActive : ""}`}
                    onClick={() => setView(item.id)}
                  >
                    <TabIcon name={item.id} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {error !== null ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {firstPaint ? (
          <>
            <div className={styles.skeletonGrid} aria-hidden="true">
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </>
        ) : null}

        {!firstPaint && showTape ? (
          <>
            <div className={styles.rangeRow} role="group" aria-label="Range">
              {RANGE_CHIPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.navBtn} ${range === item.id ? styles.navBtnActive : ""}`}
                  onClick={() => setRange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <section className={styles.hero} aria-label="Hero totals">
              {hero.map((card) => (
                <article key={card.label} className={styles.card}>
                  <div className={styles.cardLabel}>{card.label}</div>
                  <div className={styles.cardValue}>{card.value}</div>
                  <div className={styles.cardHint}>{card.hint}</div>
                </article>
              ))}
            </section>
            {head !== null ? (
              <section className={styles.strip} aria-label="Market">
                <article className={styles.stripCard}>
                  <div className={styles.stripLabel}>Circulating APU</div>
                  <div className={styles.stripValue}>
                    {head.head.circulatingApu}
                  </div>
                </article>
                <article className={styles.stripCard}>
                  <div className={styles.stripLabel}>Escrowed APU</div>
                  <div className={styles.stripValue}>{head.head.escrowedApu}</div>
                </article>
                <article className={styles.stripCard}>
                  <div className={styles.stripLabel}>Open P2P</div>
                  <div className={styles.stripValue}>
                    {head.head.openP2pOrders}
                  </div>
                </article>
                <article className={styles.stripCard}>
                  <div className={styles.stripLabel}>Mint / burn</div>
                  <div className={styles.stripValue}>
                    {head.head.apuMintedLast24h} / {head.head.apuBurnedLast24h}
                  </div>
                  <div className={styles.splitBar} aria-hidden="true">
                    <span
                      className={styles.splitMint}
                      style={{
                        width: `${mintShare(head.head)}%`,
                      }}
                    />
                    <span
                      className={styles.splitLilac}
                      style={{
                        width: `${100 - mintShare(head.head)}%`,
                      }}
                    />
                  </div>
                </article>
              </section>
            ) : null}
            {selected !== null ? (
              <div className={styles.sourceBar} aria-label="Sources">
                {Object.entries(selected.sources).map(([source, count]) => (
                  <span key={source} className={styles.sourceChip}>
                    {source} <strong>{count}</strong>
                  </span>
                ))}
              </div>
            ) : null}
            <div className={styles.filterRow} role="group" aria-label="Tape filter">
              {(["all", "APU", "SOL", "USD", "P2P"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.navBtn} ${tapeFilter === item ? styles.navBtnActive : ""}`}
                  onClick={() => {
                    setTapeFilter(item);
                    setTxPage(1);
                  }}
                >
                  {item === "all" ? "All" : item}
                </button>
              ))}
            </div>
            {txId !== null ? (
              <p>
                Opening transaction <code>{txId}</code>…
              </p>
            ) : null}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Kind</th>
                  <th className={styles.desktopOnly}>USD</th>
                  <th className={styles.desktopOnly}>APU</th>
                  <th>SOL</th>
                  <th>Node</th>
                  <th className={styles.desktopOnly}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      No ledger rows in this filter yet.
                    </td>
                  </tr>
                ) : (
                  txs.map((row) => {
                    const tx = asTx(row);
                    const id = String(tx.id ?? "");
                    const kind = kindFromTx(tx);
                    const at = String(tx.at ?? "");
                    return (
                      <tr
                        key={id}
                        className={`${styles.row} ${newTxIds.has(id) ? styles.rowNew : ""}`}
                        onClick={() => {
                          if (id.length > 0) {
                            router.push(`/scanner/txs/${encodeURIComponent(id)}`);
                          }
                        }}
                      >
                        <td>
                          <time dateTime={at} title={at}>
                            {relativeTime(at, nowMs)}
                          </time>
                        </td>
                        <td>
                          <span className={kindClass(kind)}>{kind}</span>
                        </td>
                        <td className={styles.desktopOnly}>{formatUsd(tx.priceUsd)}</td>
                        <td className={`${styles.desktopOnly} ${signedClass(tx.powerUpsDelta) ?? ""}`}>
                          {formatApu(tx.powerUpsDelta)}
                        </td>
                        <td className={signedClass(tx.solLamportsDelta)}>
                          {formatSol(tx.solLamportsDelta)}
                        </td>
                        <td>{truncate(String(tx.playerId ?? ""))}</td>
                        <td className={styles.desktopOnly}>
                          {id.length > 0 ? truncate(id, 10) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <ScannerPagination
              page={txPage}
              pageCount={txPageCount}
              onPageChange={setTxPage}
            />
          </>
        ) : null}

        {!firstPaint && view === "analytics" && analytics !== null ? (
          <>
            <section className={styles.hero}>
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

        {!firstPaint && view === "nodes" ? (
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

        {!firstPaint && view === "blocks" ? (
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

        {view === "blocks" && leafKey !== null ? (
          <p>
            Leaf: <code>{leafKey}</code>
          </p>
        ) : null}

        {!firstPaint && view === "spaces" ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Space</th>
                <th>Tx count</th>
                <th>USD</th>
                <th>APU</th>
                <th>SOL</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr key={space.spaceId}>
                  <td>{space.spaceId}</td>
                  <td>{space.txCount}</td>
                  <td>${space.usdVolume.toFixed(2)}</td>
                  <td>{space.apuVolume ?? 0}</td>
                  <td>{formatSol(space.solVolume ?? 0).replace(/^[+−]/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!firstPaint && view === "talk" && talk !== null ? (
          <section className={styles.hero}>
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
          Agent Play Scanner · public read-only · daily close is the published
          series
        </footer>
      </div>
    </div>
  );
}

const mintShare = (head: ScannerHeadResponse["head"]): number => {
  const total = head.apuMintedLast24h + head.apuBurnedLast24h;
  if (total <= 0) return 50;
  return Math.round((head.apuMintedLast24h / total) * 100);
};
