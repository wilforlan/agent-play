"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { ScannerTxRecord } from "@agent-play/sdk";
import styles from "../../scanner-page.module.css";
import { apuWalletsFromTx } from "../../scanner-receipt";
import { fetchScannerTx } from "../../scanner-tx-api";

const LAMPORTS_PER_SOL = 1_000_000_000;

const truncate = (value: string, len = 16): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

const formatUsd = (value: number | undefined): string | null => {
  if (value === undefined) return null;
  return `$${value.toFixed(2)}`;
};

const formatSol = (lamports: number | undefined): string | null => {
  if (lamports === undefined) return null;
  const signed = lamports / LAMPORTS_PER_SOL;
  const abs = Math.abs(signed);
  const digits = abs >= 1 ? 4 : 6;
  return `${signed < 0 ? "−" : signed > 0 ? "+" : ""}${abs.toFixed(digits)} SOL`;
};

const kindFromTx = (tx: ScannerTxRecord): string => {
  if (tx.creditSource === "econext:p2p" || tx.spaceId === "econext-p2p") {
    return "P2P";
  }
  if (tx.creditSource === "econext:transfer") return "Transfer";
  if (tx.creditSource === "econext:trade") return "Trade";
  if (tx.creditSource === "econext:convert") return "Convert";
  if (tx.amenityKind === "sol_deposit") return "SOL in";
  if (tx.amenityKind === "sol_payout") return "SOL out";
  if (tx.amenityKind === "talk_time" || tx.amenityKind === "peer_talk_time") {
    return "Talk";
  }
  if (tx.itemRef.kind === "game" || tx.spaceId === "__arcade__") return "Arcade";
  return "Shop";
};

const relativeTime = (iso: string): string => {
  const atMs = Date.parse(iso);
  if (!Number.isFinite(atMs)) return iso;
  const deltaSec = Math.max(0, Math.round((Date.now() - atMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.round(deltaMin / 60);
  if (deltaHr < 48) return `${deltaHr}h ago`;
  return `${Math.round(deltaHr / 24)}d ago`;
};

const solscanUrl = (signature: string): string =>
  `https://solscan.io/tx/${encodeURIComponent(signature)}`;

export function ScannerTxClient() {
  const params = useParams();
  const txId = typeof params.id === "string" ? params.id : "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<ScannerTxRecord | null>(null);
  const [solanaWallets, setSolanaWallets] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });

  const load = useCallback(async () => {
    if (txId.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchScannerTx(txId);
      setTx(detail.tx);
      setSolanaWallets(detail.solanaWallets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transaction");
      setTx(null);
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => {
    void load();
  }, [load]);

  const kind = useMemo(() => (tx !== null ? kindFromTx(tx) : null), [tx]);
  const wallets = useMemo(
    () => (tx !== null ? apuWalletsFromTx(tx) : null),
    [tx],
  );
  const sol = useMemo(
    () => (tx !== null ? formatSol(tx.solLamportsDelta) : null),
    [tx],
  );
  const fee = useMemo(
    () => (tx !== null ? formatSol(tx.feeLamports) : null),
    [tx],
  );

  return (
    <div className={styles.page} data-scanner="true">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <h1 className={styles.title}>Receipt</h1>
            <p className={styles.subtitle}>
              {kind ?? "Transaction"} · {truncate(txId, 28)}
            </p>
          </div>
          <nav className={styles.nav} aria-label="Scanner navigation">
            <Link href="/scanner?view=txs">Transactions</Link>
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

        {!loading && tx !== null ? (
          <div className={styles.receipt}>
            <section className={styles.receiptHero} aria-label="Amounts">
              <article className={styles.card}>
                <div className={styles.cardLabel}>APU</div>
                <div className={styles.cardValue}>
                  {tx.powerUpsDelta !== undefined ? tx.powerUpsDelta : "—"}
                </div>
              </article>
              <article className={styles.card}>
                <div className={styles.cardLabel}>SOL</div>
                <div className={styles.cardValue}>{sol ?? "—"}</div>
              </article>
            </section>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <th scope="row">Kind</th>
                  <td>{kind}</td>
                </tr>
                <tr>
                  <th scope="row">When</th>
                  <td>
                    <time dateTime={tx.at} title={tx.at}>
                      {relativeTime(tx.at)}
                    </time>
                  </td>
                </tr>
                <tr>
                  <th scope="row">From / to</th>
                  <td>
                    {wallets === null ? (
                      "—"
                    ) : wallets.to === null ? (
                      <Link href={`/scanner/nodes/${encodeURIComponent(wallets.from)}`}>
                        {truncate(wallets.from, 24)}
                      </Link>
                    ) : (
                      <>
                        <Link href={`/scanner/nodes/${encodeURIComponent(wallets.from)}`}>
                          {truncate(wallets.from, 24)}
                        </Link>
                        {" → "}
                        <Link href={`/scanner/nodes/${encodeURIComponent(wallets.to)}`}>
                          {truncate(wallets.to, 24)}
                        </Link>
                      </>
                    )}
                    {solanaWallets.from !== null || solanaWallets.to !== null ? (
                      <div className={styles.cardHint}>
                        {[solanaWallets.from, solanaWallets.to]
                          .filter((address): address is string => address !== null)
                          .map((address) => truncate(address, 20))
                          .join(" → ")}
                      </div>
                    ) : null}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Node</th>
                  <td>
                    <Link href={`/scanner/nodes/${encodeURIComponent(tx.playerId)}`}>
                      {truncate(tx.playerId, 24)}
                    </Link>
                    {tx.counterpartyNodeId !== undefined ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link
                          href={`/scanner/nodes/${encodeURIComponent(tx.counterpartyNodeId)}`}
                        >
                          {truncate(tx.counterpartyNodeId, 24)}
                        </Link>
                      </>
                    ) : null}
                  </td>
                </tr>
                {tx.priceUsd !== undefined ? (
                  <tr>
                    <th scope="row">USD</th>
                    <td>{formatUsd(tx.priceUsd)}</td>
                  </tr>
                ) : null}
                {fee !== null ? (
                  <tr>
                    <th scope="row">Fee</th>
                    <td>{fee}</td>
                  </tr>
                ) : null}
                {tx.detail !== undefined ? (
                  <tr>
                    <th scope="row">Deal</th>
                    <td>{tx.detail}</td>
                  </tr>
                ) : null}
                {tx.solanaTxSignature !== undefined ? (
                  <tr>
                    <th scope="row">Solscan</th>
                    <td>
                      <a
                        href={solscanUrl(tx.solanaTxSignature)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncate(tx.solanaTxSignature, 20)}
                      </a>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <details className={styles.indexFold}>
              <summary>Index</summary>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <th scope="row">Operation</th>
                    <td>{tx.op}</td>
                  </tr>
                  <tr>
                    <th scope="row">Block rev</th>
                    <td>{tx.blockRev ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Merkle</th>
                    <td>{tx.merkleRootHex ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Host</th>
                    <td>{tx.hostId}</td>
                  </tr>
                  <tr>
                    <th scope="row">Indexed</th>
                    <td>{tx.indexedAt}</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </div>
        ) : null}

        <footer className={styles.footer}>
          Public transaction detail · indexed from the Agent Play World ledger
        </footer>
      </div>
    </div>
  );
}
