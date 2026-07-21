"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { ScannerTxRecord } from "@agent-play/sdk";
import styles from "../../scanner-page.module.css";
import { fetchScannerTx } from "../../scanner-tx-api";

const truncate = (value: string, len = 16): string =>
  value.length <= len ? value : `${value.slice(0, len)}…`;

type DetailRow = {
  label: string;
  value: string;
  href?: string;
};

const formatUsd = (value: number | undefined): string | null => {
  if (value === undefined) return null;
  return `$${value.toFixed(2)}`;
};

const buildTxDetailRows = (tx: ScannerTxRecord): DetailRow[] => {
  const rows: DetailRow[] = [
    { label: "Transaction id", value: tx.id },
    { label: "Time", value: tx.at },
    { label: "Operation", value: tx.op },
    { label: "Type", value: tx.amenityKind },
    { label: "Player", value: tx.playerId, href: `/scanner/nodes/${encodeURIComponent(tx.playerId)}` },
    { label: "Space", value: tx.spaceId },
    {
      label: "Item",
      value: `${tx.itemRef.kind}/${tx.itemRef.id}`,
    },
  ];

  const usd = formatUsd(tx.priceUsd);
  if (usd !== null) rows.push({ label: "USD", value: usd });

  if (tx.powerUpsDelta !== undefined) {
    rows.push({ label: "APU delta", value: String(tx.powerUpsDelta) });
  }
  if (tx.powerUpsEarned !== undefined) {
    rows.push({ label: "APU earned", value: String(tx.powerUpsEarned) });
  }
  if (tx.powerUpsSpent !== undefined) {
    rows.push({ label: "APU spent", value: String(tx.powerUpsSpent) });
  }
  if (tx.debitSource !== undefined) {
    rows.push({ label: "Debit source", value: tx.debitSource });
  }
  if (tx.creditSource !== undefined) {
    rows.push({ label: "Credit source", value: tx.creditSource });
  }
  if (tx.token !== undefined) {
    rows.push({ label: "Token", value: tx.token });
  }
  if (tx.detail !== undefined && tx.detail.length > 0) {
    rows.push({ label: "Detail", value: tx.detail });
  }
  if (tx.blockRev !== undefined) {
    rows.push({ label: "Block rev", value: String(tx.blockRev) });
  }
  if (tx.merkleRootHex !== undefined) {
    rows.push({ label: "Merkle root", value: tx.merkleRootHex });
  }
  rows.push({ label: "Indexed at", value: tx.indexedAt });
  rows.push({ label: "Host", value: tx.hostId });

  return rows;
};

export function ScannerTxClient() {
  const params = useParams();
  const txId = typeof params.id === "string" ? params.id : "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<ScannerTxRecord | null>(null);

  const load = useCallback(async () => {
    if (txId.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setTx(await fetchScannerTx(txId));
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

  const detailRows = useMemo(() => (tx !== null ? buildTxDetailRows(tx) : []), [tx]);

  const headline = useMemo(() => {
    if (tx === null) return null;
    const usd = formatUsd(tx.priceUsd);
    if (usd !== null) return `${tx.amenityKind} · ${usd}`;
    if (tx.powerUpsDelta !== undefined) return `${tx.amenityKind} · ${tx.powerUpsDelta} APU`;
    return tx.amenityKind;
  }, [tx]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Transaction</h1>
            <p className={styles.subtitle}>
              <code>{truncate(txId, 28)}</code>
              {headline !== null ? <span> · {headline}</span> : null}
            </p>
          </div>
          <nav className={styles.nav} aria-label="Scanner navigation">
            <Link href="/scanner?view=txs">← Transactions</Link>
            <Link href="/scanner">Scanner</Link>
          </nav>
        </header>

        {error !== null ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <p>Loading transaction…</p> : null}

        {!loading && tx !== null ? (
          <table className={styles.table}>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>
                    {row.href !== undefined ? (
                      <Link href={row.href}>{truncate(row.value, 40)}</Link>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <footer className={styles.footer}>
          Public transaction detail · indexed from the Agent Play World ledger
        </footer>
      </div>
    </div>
  );
}
