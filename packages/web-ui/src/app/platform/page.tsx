"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";
import { IosButton, IosInput, IosPanel } from "@/design-system";
import { runAql } from "@/app/playground/_lib/aql-engine";
import type { AqlExecutionState } from "@/app/playground/_lib/aql-types";
import styles from "./platform.module.css";

const DEFAULT_PLATFORM_AQL = `INSPECT SPACE
INTO snapshot
SHOW $snapshot`;

function leaseScheduledEndLabel(
  createdAt: string,
  months: number | undefined,
  status: string
): string {
  if (status === "terminated") {
    return "—";
  }
  if (months === undefined || months < 1 || !Number.isFinite(months)) {
    return "—";
  }
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const end = new Date(d.getTime());
  end.setMonth(end.getMonth() + months);
  return end.toISOString().slice(0, 10);
}

function isTenWordPassphrase(value: string): boolean {
  const words = value.trim().split(/\s+/).filter((w) => w.length > 0);
  return words.length === 10;
}

type PlatformAuth = {
  serverUrl: string;
  nodeId: string;
  passwordMaterial: string;
  spaceCatalogId: string;
  sid: string;
};

type InspectSpacePayload = {
  catalog: unknown;
  leases: unknown[];
  logs: unknown[];
};

async function postJson(input: {
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; json: Record<string, unknown>; status: number }> {
  const response = await fetch(input.url, {
    method: input.body !== undefined ? "POST" : "GET",
    headers: {
      ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(input.headers ?? {}),
    },
    ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
  });
  const json = (await response.json()) as Record<string, unknown>;
  return { ok: response.ok, json, status: response.status };
}

export default function PlatformPage() {
  const rootKeyEnv = process.env.NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY?.trim() ?? "";

  const [serverUrl, setServerUrl] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [auth, setAuth] = useState<PlatformAuth | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [detail, setDetail] = useState<InspectSpacePayload | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshing, setDetailRefreshing] = useState(false);

  const [leaseSelectedKind, setLeaseSelectedKind] = useState("");
  const [leaseDurationMonths, setLeaseDurationMonths] = useState("12");
  const [leaseEmail, setLeaseEmail] = useState("");
  const [leaseAddress, setLeaseAddress] = useState("");
  const [leaseMessage, setLeaseMessage] = useState<string | null>(null);
  const [leaseSubmitting, setLeaseSubmitting] = useState(false);
  const [leaseCancellingId, setLeaseCancellingId] = useState<string | null>(null);

  const [aqlSource, setAqlSource] = useState(DEFAULT_PLATFORM_AQL);
  const [aqlBusy, setAqlBusy] = useState(false);
  const [aqlDiagnostics, setAqlDiagnostics] = useState<string[]>([]);
  const [aqlResponse, setAqlResponse] = useState<unknown>(null);
  const [aqlExecutionState, setAqlExecutionState] = useState<AqlExecutionState | null>(null);

  const catalogRecord = useMemo((): Record<string, unknown> | null => {
    if (
      detail?.catalog === null ||
      typeof detail?.catalog !== "object" ||
      detail.catalog === null
    ) {
      return null;
    }
    return detail.catalog as Record<string, unknown>;
  }, [detail]);

  const amenities = useMemo((): string[] => {
    if (catalogRecord === null || !Array.isArray(catalogRecord.amenities)) {
      return [];
    }
    return catalogRecord.amenities.filter((x): x is string => typeof x === "string");
  }, [catalogRecord]);

  useEffect(() => {
    if (amenities.length === 0) {
      setLeaseSelectedKind("");
      return;
    }
    setLeaseSelectedKind((prev) => (amenities.includes(prev) ? prev : amenities[0] ?? ""));
  }, [amenities]);

  useEffect(() => {
    const resolved =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "";
    setServerUrl((previous) => (previous.trim() !== "" ? previous : resolved));
  }, []);

  const baseExecutionState = useMemo((): AqlExecutionState | null => {
    if (auth === null) return null;
    return {
      serverUrl: auth.serverUrl,
      mainNodeId: "",
      sid: auth.sid,
      nodePasswordMaterial: null,
      spaceCatalogId: auth.spaceCatalogId,
      spaceNodeId: auth.nodeId,
      spacePasswordMaterial: auth.passwordMaterial,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
    };
  }, [auth]);

  const refreshDetail = useCallback(async (): Promise<void> => {
    if (auth === null) return;
    setDetailError(null);
    setDetailRefreshing(true);
    try {
      const base = auth.serverUrl.replace(/\/$/, "");
      const res = await fetch(
        `${base}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(auth.sid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-node-id": auth.nodeId,
            "x-node-passw": auth.passwordMaterial,
          },
          body: JSON.stringify({
            op: "inspectSpace",
            payload: { spaceId: auth.spaceCatalogId },
          }),
        }
      );
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setDetailError(typeof json.error === "string" ? json.error : "Failed to load space");
        return;
      }
      setDetail({
        catalog: json.catalog,
        leases: Array.isArray(json.leases) ? json.leases : [],
        logs: Array.isArray(json.logs) ? json.logs : [],
      });
    } finally {
      setDetailRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    if (auth === null) return;
    void refreshDetail();
  }, [auth, refreshDetail]);

  const onLogin = async (): Promise<void> => {
    setLoginError(null);
    setBusy(true);
    try {
      const trimmedUrl = serverUrl.trim();
      const trimmedNode = nodeId.trim();
      if (!trimmedUrl || !trimmedNode) {
        setLoginError("Server URL and space node id are required.");
        return;
      }
      if (!rootKeyEnv) {
        setLoginError(
          "Set NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY (same genesis root as this deployment)."
        );
        return;
      }
      if (!isTenWordPassphrase(passphrase)) {
        setLoginError("Passphrase must be exactly 10 words.");
        return;
      }
      const material = nodeCredentialsMaterialFromHumanPassphrase(passphrase);
      const base = trimmedUrl.replace(/\/$/, "");

      const validated = await postJson({
        url: `${base}/api/nodes/validate`,
        body: { nodeId: trimmedNode, rootKey: rootKeyEnv.toLowerCase() },
      });
      if (!validated.ok || validated.json.ok !== true) {
        const reason =
          typeof validated.json.reason === "string"
            ? validated.json.reason
            : `Validation failed (${validated.status})`;
        setLoginError(reason);
        return;
      }

      const nodesRes = await fetch(`${base}/api/nodes`, {
        headers: {
          "x-node-id": trimmedNode,
          "x-node-passw": material,
        },
      });
      const nodesJson = (await nodesRes.json()) as Record<string, unknown>;
      if (!nodesRes.ok) {
        setLoginError(typeof nodesJson.error === "string" ? nodesJson.error : "Unauthorized");
        return;
      }
      const mainNode = nodesJson.mainNode as Record<string, unknown> | undefined;
      if (mainNode?.kind !== "space") {
        setLoginError("This dashboard expects a space node id (kind space).");
        return;
      }
      const spaceCatalogId =
        typeof mainNode.spaceId === "string" && mainNode.spaceId.length > 0
          ? mainNode.spaceId
          : null;
      if (spaceCatalogId === null) {
        setLoginError("Space node record is missing spaceId.");
        return;
      }

      const sessionRes = await fetch(`${base}/api/agent-play/session`);
      const sessionJson = (await sessionRes.json()) as { sid?: unknown; error?: unknown };
      if (!sessionRes.ok || typeof sessionJson.sid !== "string" || sessionJson.sid.length === 0) {
        setLoginError(
          typeof sessionJson.error === "string" ? sessionJson.error : "Session request failed"
        );
        return;
      }

      setAuth({
        serverUrl: trimmedUrl,
        nodeId: trimmedNode,
        passwordMaterial: material,
        spaceCatalogId,
        sid: sessionJson.sid,
      });
      setPassphrase("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onLogout = (): void => {
    setAuth(null);
    setDetail(null);
    setDetailError(null);
    setDetailRefreshing(false);
    setLeaseSubmitting(false);
    setLeaseCancellingId(null);
    setLeaseSelectedKind("");
    setLeaseDurationMonths("12");
    setAqlExecutionState(null);
    setAqlResponse(null);
    setAqlDiagnostics([]);
  };

  const onSubmitLease = async (): Promise<void> => {
    if (auth === null) return;
    if (amenities.length === 0 || leaseSelectedKind.length === 0) {
      setLeaseMessage("Add at least one amenity to this space before creating a lease.");
      return;
    }
    const durationParsed = Number.parseInt(leaseDurationMonths.trim(), 10);
    if (
      !Number.isInteger(durationParsed) ||
      durationParsed < 1 ||
      durationParsed > 240
    ) {
      setLeaseMessage("Duration must be a whole number of months between 1 and 240.");
      return;
    }
    setLeaseMessage(null);
    setLeaseSubmitting(true);
    try {
      const base = auth.serverUrl.replace(/\/$/, "");
      const payload: Record<string, unknown> = {
        spaceId: auth.spaceCatalogId,
        amenityKind: leaseSelectedKind,
        tenantEmail: leaseEmail.trim(),
        tenantAddress: leaseAddress.trim(),
        durationMonths: durationParsed,
      };
      const res = await fetch(
        `${base}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(auth.sid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-node-id": auth.nodeId,
            "x-node-passw": auth.passwordMaterial,
          },
          body: JSON.stringify({ op: "createAmenityLease", payload }),
        }
      );
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setLeaseMessage(typeof json.error === "string" ? json.error : "Lease request failed");
        return;
      }
      setLeaseMessage("Lease recorded.");
      setLeaseEmail("");
      setLeaseAddress("");
      await refreshDetail();
    } catch (err) {
      setLeaseMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLeaseSubmitting(false);
    }
  };

  const onCancelLease = async (leaseId: string): Promise<void> => {
    if (auth === null) return;
    setLeaseMessage(null);
    setLeaseCancellingId(leaseId);
    try {
      const base = auth.serverUrl.replace(/\/$/, "");
      const res = await fetch(
        `${base}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(auth.sid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-node-id": auth.nodeId,
            "x-node-passw": auth.passwordMaterial,
          },
          body: JSON.stringify({
            op: "cancelAmenityLease",
            payload: { spaceId: auth.spaceCatalogId, leaseId },
          }),
        }
      );
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setLeaseMessage(typeof json.error === "string" ? json.error : "Could not cancel lease");
        return;
      }
      await refreshDetail();
    } catch (err) {
      setLeaseMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLeaseCancellingId(null);
    }
  };

  const onRunAql = async (): Promise<void> => {
    if (baseExecutionState === null) return;
    setAqlBusy(true);
    setAqlDiagnostics([]);
    try {
      const prev = aqlExecutionState;
      const mergedState: AqlExecutionState = {
        ...baseExecutionState,
        ...(prev ?? {}),
        headers: {
          ...baseExecutionState.headers,
          ...(prev?.headers ?? {}),
        },
      };
      const source = `LET serverUrl = "${auth?.serverUrl.trim() ?? ""}"\n${aqlSource}`;
      const result = await runAql({ source, state: mergedState });
      setAqlExecutionState(result.nextState);
      setAqlResponse(result.response);
      if (result.diagnostics.length > 0) {
        setAqlDiagnostics(result.diagnostics.map((d) => `${d.code}: ${d.message}`));
        return;
      }
      await refreshDetail();
    } catch (err) {
      setAqlDiagnostics([err instanceof Error ? err.message : String(err)]);
    } finally {
      setAqlBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <IosPanel className={styles.panelBody}>
        <h1 className={styles.heroTitle}>Space owner platform</h1>
        <p className={styles.lead}>
          Authenticate with your space node id and ten-word passphrase. Amenities, logs, and
          leases use the same sdk/rpc paths as the playground AQL runtime.
        </p>
      </IosPanel>

      {auth === null ? (
        <IosPanel className={styles.panelBody}>
          <div className={styles.field}>
            <label className="ios-label" htmlFor="pf-server">
              Server URL
            </label>
            <IosInput
              id="pf-server"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-deployment.example"
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label className="ios-label" htmlFor="pf-node">
              Space node id
            </label>
            <IosInput
              id="pf-node"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              placeholder="Space node id"
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label className="ios-label" htmlFor="pf-pass">
              Ten-word passphrase
            </label>
            <textarea
              id="pf-pass"
              className={[styles.textarea, styles.passphrase].join(" ")}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              spellCheck={false}
            />
          </div>
          {loginError !== null ? <p className={styles.lead}>{loginError}</p> : null}
          <IosButton type="button" onClick={onLogin} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </IosButton>
        </IosPanel>
      ) : (
        <>
          <IosPanel className={styles.panelBody}>
            <div className={styles.actionBar}>
              <span className={`${styles.lead} ${styles.actionBarLead}`}>
                Space{" "}
                <strong>
                  {typeof catalogRecord?.name === "string" && catalogRecord.name.length > 0
                    ? catalogRecord.name
                    : auth.spaceCatalogId}
                </strong>{" "}
                ({auth.nodeId})
              </span>
              <div className={styles.actions}>
                <IosButton type="button" onClick={onLogout}>
                  Sign out
                </IosButton>
                <IosButton
                  type="button"
                  onClick={() => void refreshDetail()}
                  disabled={busy || detailRefreshing}
                >
                  {detailRefreshing ? "Refreshing…" : "Refresh"}
                </IosButton>
              </div>
            </div>
            {detailError !== null ? <p className={styles.lead}>{detailError}</p> : null}
            <h2 className={styles.sectionTitle}>Amenities</h2>
            {detailRefreshing ? (
              <p className={styles.loadingHint}>Loading amenities…</p>
            ) : (
              <div className={styles.tagList}>
                {amenities.length === 0 ? (
                  <span className={styles.lead}>No amenities yet.</span>
                ) : (
                  amenities.map((a) => (
                    <span key={a} className={styles.tag}>
                      {a}
                    </span>
                  ))
                )}
              </div>
            )}
          </IosPanel>

          <IosPanel className={styles.panelBody}>
            <h2 className={styles.sectionTitle}>Activity logs</h2>
            {detailRefreshing ? (
              <p className={styles.loadingHint}>Loading activity logs…</p>
            ) : (
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
                    {(detail?.logs ?? []).slice(0, 80).map((row, i) => {
                      const r = row as Record<string, unknown>;
                      const at = typeof r.at === "string" ? r.at : "";
                      const action = typeof r.action === "string" ? r.action : "";
                      const detailText =
                        r.detail !== undefined ? JSON.stringify(r.detail) : "";
                      return (
                        <tr key={`${at}-${i}`}>
                          <td>{at}</td>
                          <td>{action}</td>
                          <td>{detailText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </IosPanel>

          <IosPanel className={styles.panelBody}>
            <h2 className={styles.sectionTitle}>Leasing</h2>
            <p className={styles.lead}>
              Choose an amenity that already exists on this space, then record tenant details and
              duration.
            </p>
            {amenities.length === 0 ? (
              <p className={styles.lead}>
                Add at least one amenity before leasing (for example use Embedded AQL:{" "}
                <code style={{ fontSize: "0.85em" }}>ADD AMENITY &quot;shop&quot;</code>, then
                refresh).
              </p>
            ) : (
              <>
                <div className={styles.field}>
                  <label className="ios-label" htmlFor="pf-kind">
                    Amenity
                  </label>
                  <select
                    id="pf-kind"
                    className={styles.textarea}
                    style={{ minHeight: "2.5rem" }}
                    value={leaseSelectedKind}
                    onChange={(e) => setLeaseSelectedKind(e.target.value)}
                  >
                    {amenities.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.gridTwo}>
                  <div className={styles.field}>
                    <label className="ios-label" htmlFor="pf-duration">
                      Duration (months)
                    </label>
                    <IosInput
                      id="pf-duration"
                      type="number"
                      className={styles.durationInput}
                      min={1}
                      max={240}
                      value={leaseDurationMonths}
                      onChange={(e) => setLeaseDurationMonths(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className="ios-label" htmlFor="pf-email">
                      Tenant email
                    </label>
                    <IosInput
                      id="pf-email"
                      type="email"
                      value={leaseEmail}
                      onChange={(e) => setLeaseEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className="ios-label" htmlFor="pf-addr">
                    Tenant address
                  </label>
                  <IosInput
                    id="pf-addr"
                    value={leaseAddress}
                    onChange={(e) => setLeaseAddress(e.target.value)}
                  />
                </div>
              </>
            )}
            {leaseMessage !== null ? <p className={styles.lead}>{leaseMessage}</p> : null}
            <IosButton
              type="button"
              onClick={() => void onSubmitLease()}
              disabled={
                amenities.length === 0 ||
                leaseSubmitting ||
                detailRefreshing ||
                leaseSelectedKind.length === 0
              }
            >
              {leaseSubmitting ? "Submitting lease…" : "Submit lease"}
            </IosButton>

            <h3 className={styles.subsectionTitle}>Leases on file</h3>
            {detailRefreshing ? (
              <p className={styles.loadingHint}>Loading leases…</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Email</th>
                      <th>Months</th>
                      <th>Ends (est.)</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.leases ?? []).map((row, i) => {
                      const r = row as Record<string, unknown>;
                      const leaseId = String(r.leaseId ?? i);
                      const status = String(r.status ?? "");
                      const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
                      const monthsRaw = r.durationMonths;
                      const months =
                        typeof monthsRaw === "number"
                          ? monthsRaw
                          : typeof monthsRaw === "string"
                            ? Number.parseInt(monthsRaw, 10)
                            : undefined;
                      const ended = status === "terminated";
                      return (
                        <tr
                          key={leaseId}
                          className={ended ? styles.rowTerminated : undefined}
                        >
                          <td>{String(r.amenityKind ?? "")}</td>
                          <td>{String(r.tenantEmail ?? "")}</td>
                          <td>{months !== undefined && Number.isFinite(months) ? months : "—"}</td>
                          <td>
                            {leaseScheduledEndLabel(createdAt, months, status)}
                          </td>
                          <td>{status}</td>
                          <td>{createdAt}</td>
                          <td className={styles.cancelCell}>
                            {!ended ? (
                              <IosButton
                                type="button"
                                onClick={() => void onCancelLease(leaseId)}
                                disabled={
                                  leaseCancellingId !== null || leaseSubmitting || detailRefreshing
                                }
                              >
                                {leaseCancellingId === leaseId ? "Cancelling…" : "Cancel lease"}
                              </IosButton>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </IosPanel>

          <IosPanel className={styles.panelBody}>
            <h2 className={styles.sectionTitle}>Embedded AQL</h2>
            <p className={styles.lead}>
              Session state includes your space credentials; use INSPECT SPACE, ADD AMENITY, and
              CREATE LEASE AMENITY with MONTHS (no need to repeat USE SPACE NODE). Add amenities
              before creating leases.
            </p>
            <textarea
              className={styles.textarea}
              value={aqlSource}
              onChange={(e) => setAqlSource(e.target.value)}
              spellCheck={false}
            />
            <div className={styles.actions}>
              <IosButton type="button" onClick={() => void onRunAql()} disabled={aqlBusy}>
                {aqlBusy ? "Running…" : "Run AQL"}
              </IosButton>
            </div>
            <div className={styles.monoStack}>
              {aqlDiagnostics.length > 0 ? (
                <pre className={styles.monoBlock}>{aqlDiagnostics.join("\n")}</pre>
              ) : null}
              <pre className={styles.monoBlock}>
                {aqlResponse === undefined || aqlResponse === null
                  ? "(no result)"
                  : JSON.stringify(aqlResponse, null, 2)}
              </pre>
            </div>
          </IosPanel>
        </>
      )}
    </div>
  );
}
