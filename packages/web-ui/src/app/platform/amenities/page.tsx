"use client";

import { useMemo } from "react";
import Link from "next/link";
import { fetchInspectSpace, type PlatformAuth } from "../platform-api";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";
import { usePlatformQuery } from "../use-platform-query";

const fetchAmenityKinds = async (auth: PlatformAuth): Promise<string[]> => {
  const detail = await fetchInspectSpace(auth);
  const catalog =
    detail.catalog !== null && typeof detail.catalog === "object"
      ? (detail.catalog as Record<string, unknown>)
      : null;
  return Array.isArray(catalog?.amenities)
    ? catalog.amenities.filter((x): x is string => typeof x === "string")
    : [];
};

export default function PlatformAmenitiesPage() {
  const { data: amenities, error, loading, reload } = usePlatformQuery({
    queryKey: "amenities",
    fetcher: fetchAmenityKinds,
  });
  const list = amenities ?? [];
  const contentKinds = useMemo(
    () => list.filter((k) => k === "shop" || k === "supermarket" || k === "car_wash"),
    [list]
  );

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Amenities</h1>
        <p className={styles.lead}>Manage items for shop, supermarket, and car wash amenities.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.tagList}>
          {list.length === 0 ? (
            <span className={styles.lead}>{loading ? "Loading…" : "No amenities on this space."}</span>
          ) : (
            list.map((kind) => (
              <span key={kind} className={styles.tag}>
                {kind}
              </span>
            ))
          )}
        </div>
        {contentKinds.length > 0 ? (
          <>
            <h2 className={styles.title}>Item catalogs</h2>
            <div className={styles.actions}>
              {contentKinds.map((kind) => (
                <Link key={kind} href={`/platform/amenities/${kind}`} className={styles.navLink}>
                  Manage {kind}
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </PlatformRequireAuth>
  );
}
