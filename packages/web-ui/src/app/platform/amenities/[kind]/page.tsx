"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  fetchInspectAmenityItems,
  postPlatformRpc,
  type PlatformAuth,
} from "../../platform-api";
import { usePlatformAuth } from "../../platform-auth-context";
import { PlatformRequireAuth } from "../../platform-shell";
import styles from "../../platform-admin.module.css";
import { usePlatformQuery } from "../../use-platform-query";

const CONTENT_KINDS = new Set(["shop", "supermarket", "car_wash"]);

const removeOpForKind = (kind: string): string => {
  if (kind === "shop") return "removeShopItem";
  if (kind === "supermarket") return "removeSupermarketItem";
  return "removeCarWashCar";
};

const addOpForKind = (kind: string): string => {
  if (kind === "shop") return "addShopItem";
  if (kind === "supermarket") return "addSupermarketItem";
  return "addCarWashCar";
};

export default function PlatformAmenityKindPage() {
  const params = useParams();
  const kind = typeof params.kind === "string" ? params.kind : "";
  const { auth } = usePlatformAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("10");
  const [shopType, setShopType] = useState("book");
  const [row, setRow] = useState("1");
  const [carModel, setCarModel] = useState("sedan");
  const [carYear, setCarYear] = useState("2024");
  const [carColor, setCarColor] = useState("#3366cc");

  const validKind = useMemo(() => CONTENT_KINDS.has(kind), [kind]);
  const itemsFetcher = useCallback(
    (auth: PlatformAuth) => fetchInspectAmenityItems(auth, kind),
    [kind]
  );
  const { data: items, error, loading, reload } = usePlatformQuery({
    queryKey: `amenity-items:${kind}`,
    fetcher: itemsFetcher,
    enabled: validKind,
  });
  const rows = items ?? [];

  const onAdd = async (): Promise<void> => {
    if (auth === null || !validKind) return;
    setMessage(null);
    setActionError(null);
    const price = Number.parseFloat(priceUsd);
    if (!Number.isFinite(price) || price <= 0) {
      setActionError("Price must be a positive number.");
      return;
    }
    setAdding(true);
    try {
      const payload: Record<string, unknown> = {
        spaceId: auth.spaceCatalogId,
        name: name.trim(),
        description: description.trim(),
        priceUsd: price,
      };
      if (kind === "shop") {
        payload.type = shopType;
      } else if (kind === "supermarket") {
        payload.row = Number.parseInt(row, 10);
      } else {
        payload.model = carModel.trim();
        payload.year = Number.parseInt(carYear, 10);
        payload.colorHex = carColor.trim();
      }
      const result = await postPlatformRpc<{ error?: string }>({
        auth,
        op: addOpForKind(kind),
        payload,
      });
      if (!result.ok) {
        setActionError(typeof result.json.error === "string" ? result.json.error : "Add failed");
        return;
      }
      setMessage("Item added.");
      setName("");
      setDescription("");
      await reload();
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (itemId: string): Promise<void> => {
    if (auth === null || !validKind) return;
    setBusyId(itemId);
    setActionError(null);
    const result = await postPlatformRpc<{ error?: string }>({
      auth,
      op: removeOpForKind(kind),
      payload: { spaceId: auth.spaceCatalogId, itemId },
    });
    setBusyId(null);
    if (!result.ok) {
      setActionError(typeof result.json.error === "string" ? result.json.error : "Remove failed");
      return;
    }
    await reload();
  };

  if (!validKind) {
    return (
      <PlatformRequireAuth>
        <div className={styles.panel}>
          <p className={styles.error}>Unknown amenity kind. Use shop, supermarket, or car_wash.</p>
        </div>
      </PlatformRequireAuth>
    );
  }

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>{kind} items</h1>
        <p className={styles.lead}>Add and remove catalog items. Sold items show purchase status.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        {actionError !== null ? <p className={styles.error}>{actionError}</p> : null}
        {message !== null ? <p className={styles.lead}>{message}</p> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>{loading ? "Loading…" : "No items."}</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>${item.priceUsd.toFixed(2)}</td>
                    <td
                      className={
                        item.sale.status === "available" ? styles.badgeAvailable : styles.badgeSold
                      }
                    >
                      {item.sale.status}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.button}
                        disabled={busyId !== null}
                        onClick={() => void onRemove(item.id)}
                      >
                        {busyId === item.id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2 className={styles.title}>Add item</h2>
        <fieldset disabled={adding} style={{ border: "none", margin: 0, padding: 0 }}>
        <div className={styles.field}>
          <label htmlFor="item-name">Name</label>
          <input
            id="item-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="item-desc">Description</label>
          <input
            id="item-desc"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="item-price">Price USD</label>
          <input
            id="item-price"
            className={styles.input}
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
          />
        </div>
        {kind === "shop" ? (
          <div className={styles.field}>
            <label htmlFor="item-type">Type</label>
            <select
              id="item-type"
              className={styles.select}
              value={shopType}
              onChange={(e) => setShopType(e.target.value)}
            >
              <option value="book">book</option>
              <option value="music">music</option>
              <option value="coffee">coffee</option>
            </select>
          </div>
        ) : null}
        {kind === "supermarket" ? (
          <div className={styles.field}>
            <label htmlFor="item-row">Row (1-4)</label>
            <input
              id="item-row"
              className={styles.input}
              value={row}
              onChange={(e) => setRow(e.target.value)}
            />
          </div>
        ) : null}
        {kind === "car_wash" ? (
          <>
            <div className={styles.field}>
              <label htmlFor="car-model">Model</label>
              <input
                id="car-model"
                className={styles.input}
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="car-year">Year</label>
              <input
                id="car-year"
                className={styles.input}
                value={carYear}
                onChange={(e) => setCarYear(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="car-color">Color hex</label>
              <input
                id="car-color"
                className={styles.input}
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <button
          type="button"
          className={[styles.button, styles.buttonPrimary, styles.buttonWithSpinner].join(" ")}
          onClick={() => void onAdd()}
          disabled={adding}
        >
          {adding ? <span className={styles.spinner} aria-hidden /> : null}
          {adding ? "Adding item…" : "Add item"}
        </button>
        </fieldset>
      </div>
    </PlatformRequireAuth>
  );
}
