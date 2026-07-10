"use client";

import { useMemo } from "react";
import { fetchInspectSpace, type PlatformAuth } from "../platform-api";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";
import { usePlatformQuery } from "../use-platform-query";

const fetchActivityLogs = async (auth: PlatformAuth): Promise<unknown[]> => {
  const detail = await fetchInspectSpace(auth);
  return detail.logs;
};

export default function PlatformActivityPage() {
  const { data: logs, error, loading, reload } = usePlatformQuery({
    queryKey: "activity",
    fetcher: fetchActivityLogs,
  });
  const rows = useMemo(() => logs ?? [], [logs]);

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Activity</h1>
        <p className={styles.lead}>
          Space amenity logs. Purchase events use action <code>purchase</code>.
        </p>
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
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 120).map((row, i) => {
                const r = row as Record<string, unknown>;
                const at = typeof r.at === "string" ? r.at : "";
                const action = typeof r.action === "string" ? r.action : "";
                const detailText = r.detail !== undefined ? JSON.stringify(r.detail) : "";
                const purchaseRow = action === "purchase";
                return (
                  <tr key={`${at}-${i}`} className={purchaseRow ? styles.badgeAvailable : undefined}>
                    <td>{at}</td>
                    <td>{action}</td>
                    <td>{detailText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformRequireAuth>
  );
}
