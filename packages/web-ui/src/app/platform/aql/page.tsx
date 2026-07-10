"use client";

import { useMemo, useState } from "react";
import { runAql } from "@/app/playground/_lib/aql-engine";
import type { AqlExecutionState } from "@/app/playground/_lib/aql-types";
import { fetchInspectSpace } from "../platform-api";
import { usePlatformAuth } from "../platform-auth-context";
import { PlatformRequireAuth } from "../platform-shell";
import styles from "../platform-admin.module.css";

const DEFAULT_PLATFORM_AQL = `INSPECT SPACE
INTO snapshot
SHOW $snapshot`;

export default function PlatformAqlPage() {
  const { auth } = usePlatformAuth();
  const [aqlSource, setAqlSource] = useState(DEFAULT_PLATFORM_AQL);
  const [aqlBusy, setAqlBusy] = useState(false);
  const [aqlDiagnostics, setAqlDiagnostics] = useState<string[]>([]);
  const [aqlResponse, setAqlResponse] = useState<unknown>(null);
  const [aqlExecutionState, setAqlExecutionState] = useState<AqlExecutionState | null>(null);

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
      targetAmenityKind: null,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
      platformServiceKey: auth.platformServiceKey,
    };
  }, [auth]);

  const onRunAql = async (): Promise<void> => {
    if (baseExecutionState === null || auth === null) return;
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
      const source = `LET serverUrl = "${auth.serverUrl.trim()}"\n${aqlSource}`;
      const result = await runAql({ source, state: mergedState });
      setAqlExecutionState(result.nextState);
      setAqlResponse(result.response);
      if (result.diagnostics.length > 0) {
        setAqlDiagnostics(result.diagnostics.map((d) => `${d.code}: ${d.message}`));
        return;
      }
      await fetchInspectSpace(auth);
    } catch (err) {
      setAqlDiagnostics([err instanceof Error ? err.message : String(err)]);
    } finally {
      setAqlBusy(false);
    }
  };

  return (
    <PlatformRequireAuth>
      <div className={styles.panel}>
        <h1 className={styles.title}>Embedded AQL</h1>
        <p className={styles.lead}>
          Session state includes your space credentials. Use INSPECT SPACE, ADD AMENITY, ADD SHOP
          ITEM, and related commands without repeating USE SPACE NODE.
        </p>
        <textarea
          className={styles.textarea}
          value={aqlSource}
          onChange={(e) => setAqlSource(e.target.value)}
          spellCheck={false}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void onRunAql()} disabled={aqlBusy}>
            {aqlBusy ? "Running…" : "Run AQL"}
          </button>
        </div>
        {aqlDiagnostics.length > 0 ? (
          <pre className={styles.mono}>{aqlDiagnostics.join("\n")}</pre>
        ) : null}
        <pre className={styles.mono}>
          {aqlResponse === undefined || aqlResponse === null
            ? "(no result)"
            : JSON.stringify(aqlResponse, null, 2)}
        </pre>
      </div>
    </PlatformRequireAuth>
  );
}
