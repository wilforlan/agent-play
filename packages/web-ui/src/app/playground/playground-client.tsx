"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./playground.module.css";
import { runAql } from "./_lib/aql-engine";
import type { AqlExecutionState } from "./_lib/aql-types";
import { IosButton, IosInput, IosPanel } from "@/design-system";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";
import {
  applyAqlAutocomplete,
  getAqlAutocomplete,
  type AqlSuggestion,
} from "./_lib/aql-autocomplete";

const DEFAULT_AQL = `LET mainNode = "main-node-id"
LET targetNode = "agent-node-id"

# Session comes from Connect above — CONNECT is optional here if already connected.
INSPECT MAIN NODE
USE AGENT NODE $targetNode
WITH TIMEOUT 8000
SEND "status check"
INTO latestResponse
SHOW RESPONSE
SHOW HEADERS

# Move to a different agent node and inspect agent fields:
# SHIFT AGENT NODE "another-agent-node-id"
# INSPECT AGENT NODE
# INSPECT AGENT
# SHOW $agent.name
`;

type PlaygroundClientProps = {
  defaultServerUrl: string;
};

function pretty(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function escapeAqlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function applyMainNodeToAql(previousAql: string, mainNode: string): string {
  return previousAql.replace(
    /(LET\s+mainNode\s*=\s*)("[^"]*")/i,
    (_, prefix: string) => `${prefix}"${escapeAqlDoubleQuoted(mainNode)}"`
  );
}

function isTenWordPassphrase(value: string): boolean {
  return value.trim().split(/\s+/).filter((word) => word.length > 0).length === 10;
}

export default function PlaygroundClient({ defaultServerUrl }: PlaygroundClientProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [mainNodeId, setMainNodeId] = useState("");
  const [mainPassphrase, setMainPassphrase] = useState("");
  const [aql, setAql] = useState(DEFAULT_AQL);
  const [autocomplete, setAutocomplete] = useState<{
    from: number;
    to: number;
    options: AqlSuggestion[];
    selectedIndex: number;
  }>({ from: 0, to: 0, options: [], selectedIndex: 0 });
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected">(
    "disconnected"
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<unknown>({ ok: false, message: "No response yet" });
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [executionState, setExecutionState] = useState<AqlExecutionState>({
    serverUrl: defaultServerUrl,
    mainNodeId: "",
    sid: null,
    nodePasswordMaterial: null,
    spaceCatalogId: null,
    spaceNodeId: null,
    spacePasswordMaterial: null,
    targetAgentId: null,
    targetNodeId: null,
    timeoutMs: 8000,
    headers: {},
  });

  useEffect(() => {
    const resolved =
      defaultServerUrl.trim() !== ""
        ? defaultServerUrl.trim()
        : `${window.location.protocol}//${window.location.host}`;
    setServerUrl(resolved);
    setExecutionState((previous) => ({ ...previous, serverUrl: resolved }));
  }, [defaultServerUrl]);

  const statusClassName = useMemo(() => {
    if (connectionStatus === "connected") {
      return `${styles.statusChip} ${styles.statusConnected}`;
    }
    if (
      connectionStatus === "disconnected" &&
      mainNodeId.trim() !== "" &&
      isTenWordPassphrase(mainPassphrase)
    ) {
      return `${styles.statusChip} ${styles.statusReady}`;
    }
    return styles.statusChip;
  }, [connectionStatus, mainNodeId, mainPassphrase]);

  const rootKeyEnv = process.env.NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY?.trim() ?? "";

  const refreshAutocomplete = (source: string, cursor: number): void => {
    const next = getAqlAutocomplete({ source, cursor });
    setAutocomplete({
      from: next.from,
      to: next.to,
      options: next.options,
      selectedIndex: 0,
    });
  };

  const acceptAutocomplete = (selected: AqlSuggestion): void => {
    const applied = applyAqlAutocomplete({
      source: aql,
      from: autocomplete.from,
      to: autocomplete.to,
      insertText: selected.insertText,
    });
    setAql(applied.source);
    setAutocomplete({ from: 0, to: 0, options: [], selectedIndex: 0 });
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (editor === null) return;
      editor.focus();
      editor.setSelectionRange(applied.cursor, applied.cursor);
    });
  };

  const onDisconnect = (): void => {
    setConnectionStatus("disconnected");
    setIsConnecting(false);
    setIsRunning(false);
    setMainNodeId("");
    setMainPassphrase("");
    setAql(DEFAULT_AQL);
    setDiagnostics([]);
    setResponse({ ok: false, message: "No response yet" });
    setHeaders({});
    setExecutionState((previous) => ({
      ...previous,
      mainNodeId: "",
      sid: null,
      nodePasswordMaterial: null,
      spaceCatalogId: null,
      spaceNodeId: null,
      spacePasswordMaterial: null,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
    }));
  };

  const onConnect = async (): Promise<void> => {
    setDiagnostics([]);
    const trimmedUrl = serverUrl.trim();
    const trimmedMain = mainNodeId.trim();
    if (!trimmedUrl || !trimmedMain) {
      setDiagnostics(["Server URL and Main Node ID are required."]);
      return;
    }
    if (!rootKeyEnv) {
      setDiagnostics([
        "Set NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY to your genesis root id (same as the .root file used by this deployment).",
      ]);
      return;
    }
    if (!isTenWordPassphrase(mainPassphrase)) {
      setDiagnostics(["Main node passphrase must be exactly 10 words."]);
      return;
    }
    setIsConnecting(true);
    try {
      const material = nodeCredentialsMaterialFromHumanPassphrase(mainPassphrase);
      const base = trimmedUrl.replace(/\/$/, "");
      const validateRes = await fetch(`${base}/api/nodes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: trimmedMain,
          rootKey: rootKeyEnv.toLowerCase(),
        }),
      });
      const validateJson = (await validateRes.json()) as {
        ok?: unknown;
        reason?: unknown;
      };
      if (!validateRes.ok || validateJson.ok !== true) {
        const reason =
          typeof validateJson.reason === "string"
            ? validateJson.reason
            : `HTTP ${validateRes.status}`;
        throw new Error(`Node validation failed: ${reason}`);
      }
      const sessionRes = await fetch(`${base}/api/agent-play/session`);
      const sessionJson = (await sessionRes.json()) as { sid?: unknown };
      if (!sessionRes.ok || typeof sessionJson.sid !== "string" || sessionJson.sid.length === 0) {
        throw new Error(
          typeof sessionJson === "object" && sessionJson !== null && "error" in sessionJson
            ? String((sessionJson as { error?: unknown }).error)
            : "Session request failed"
        );
      }
      setExecutionState({
        serverUrl: trimmedUrl,
        mainNodeId: trimmedMain,
        sid: sessionJson.sid,
        nodePasswordMaterial: material,
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
      });
      setResponse({ connected: true, sid: sessionJson.sid, validatedMainNode: trimmedMain });
      setHeaders({});
      setConnectionStatus("connected");
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : String(error)]);
      setConnectionStatus("disconnected");
    } finally {
      setIsConnecting(false);
    }
  };

  const onExecute = async (): Promise<void> => {
    setIsRunning(true);
    setDiagnostics([]);
    try {
      const nextState: AqlExecutionState = {
        ...executionState,
        serverUrl: serverUrl.trim(),
        mainNodeId: mainNodeId.trim(),
      };
      const source = `LET serverUrl = "${serverUrl.trim()}"\n${aql}`;
      const result = await runAql({ source, state: nextState });
      setExecutionState(result.nextState);
      setResponse(result.response);
      setHeaders(result.headers);
      if (result.diagnostics.length > 0) {
        setDiagnostics(result.diagnostics.map((d) => `${d.code}: ${d.message}`));
        return;
      }
      if (result.nextState.sid !== null) {
        setConnectionStatus("connected");
      }
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <IosPanel className={styles.header}>
        <div className={styles.field}>
          <label className="ios-label" htmlFor="server-url">
            Server URL
          </label>
          <IosInput
            id="server-url"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="http://localhost:3000"
          />
        </div>
        <div className={styles.field}>
          <label className="ios-label" htmlFor="main-node-id">
            Main Node ID
          </label>
          <IosInput
            id="main-node-id"
            value={mainNodeId}
            onChange={(event) => {
              const next = event.target.value;
              setMainNodeId(next);
              setAql((previous) => applyMainNodeToAql(previous, next));
            }}
            placeholder="main-node-id"
          />
        </div>
        <div className={styles.field}>
          <label className="ios-label" htmlFor="main-passphrase">
            Main passphrase (10 words)
          </label>
          <IosInput
            id="main-passphrase"
            type="password"
            autoComplete="off"
            value={mainPassphrase}
            onChange={(event) => setMainPassphrase(event.target.value)}
            placeholder="word1 word2 ... word10"
          />
        </div>
        <div className={styles.headerActions}>
          <span className={statusClassName}>
            <span className={styles.statusDot} />
            State: {connectionStatus}
          </span>
          <IosButton
            type="button"
            onClick={() =>
              connectionStatus === "connected"
                ? onDisconnect()
                : void onConnect()
            }
            disabled={isConnecting || isRunning}
          >
            {connectionStatus === "connected"
              ? "Disconnect"
              : isConnecting
                ? "Connecting..."
                : "Connect"}
          </IosButton>
        </div>
      </IosPanel>

      <div className={styles.workspace}>
        <IosPanel className={styles.leftPane}>
          <h2 style={{ margin: 0, fontSize: 15 }}>AQL Editor</h2>
          <textarea
            ref={editorRef}
            className={styles.editor}
            spellCheck={false}
            value={aql}
            onChange={(event) => {
              const source = event.target.value;
              setAql(source);
              refreshAutocomplete(source, event.target.selectionStart ?? source.length);
            }}
            onClick={(event) => {
              const cursor = event.currentTarget.selectionStart ?? aql.length;
              refreshAutocomplete(event.currentTarget.value, cursor);
            }}
            onKeyUp={(event) => {
              const cursor = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
              refreshAutocomplete(event.currentTarget.value, cursor);
            }}
            onKeyDown={(event) => {
              if (event.key === "Tab" && autocomplete.options.length > 0) {
                event.preventDefault();
                const selected = autocomplete.options[autocomplete.selectedIndex];
                if (selected !== undefined) acceptAutocomplete(selected);
                return;
              }
              if (event.key === "ArrowDown" && autocomplete.options.length > 0) {
                event.preventDefault();
                setAutocomplete((prev) => ({
                  ...prev,
                  selectedIndex: Math.min(prev.selectedIndex + 1, prev.options.length - 1),
                }));
                return;
              }
              if (event.key === "ArrowUp" && autocomplete.options.length > 0) {
                event.preventDefault();
                setAutocomplete((prev) => ({
                  ...prev,
                  selectedIndex: Math.max(prev.selectedIndex - 1, 0),
                }));
                return;
              }
              if (event.key === "Enter" && autocomplete.options.length > 0) {
                event.preventDefault();
                const selected = autocomplete.options[autocomplete.selectedIndex];
                if (selected !== undefined) acceptAutocomplete(selected);
              }
            }}
          />
          {autocomplete.options.length > 0 ? (
            <div className={styles.autocompleteMenu}>
              {autocomplete.options.map((option, index) => (
                <button
                  key={`${option.kind}-${option.label}`}
                  type="button"
                  className={
                    index === autocomplete.selectedIndex
                      ? `${styles.autocompleteItem} ${styles.autocompleteItemActive}`
                      : styles.autocompleteItem
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    acceptAutocomplete(option);
                  }}
                >
                  <span>{option.label}</span>
                  <span className={styles.autocompleteKind}>{option.kind}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.leftActions}>
            <span className={styles.meta}>
              SID: {executionState.sid ?? "not connected"}
            </span>
            <IosButton
              type="button"
              onClick={() => void onExecute()}
              disabled={isRunning || isConnecting}
            >
              {isRunning ? "Running..." : "Run"}
            </IosButton>
          </div>
          {diagnostics.length > 0 ? (
            <ul className={styles.diagList}>
              {diagnostics.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </IosPanel>

        <div className={styles.rightPane}>
          <IosPanel className={styles.panel}>
            <h3>Response Preview</h3>
            <div className={styles.inspectorGrid}>
              <div className={styles.box}>
                <p className={styles.boxTitle}>Main Node</p>
                <code className={styles.boxCode}>{executionState.mainNodeId || "n/a"}</code>
              </div>
              <div className={styles.box}>
                <p className={styles.boxTitle}>Target Agent</p>
                <code className={styles.boxCode}>{executionState.targetAgentId ?? "n/a"}</code>
              </div>
            </div>
            <pre className={styles.pre}>{pretty(response)}</pre>
          </IosPanel>

          <IosPanel className={styles.panel}>
            <h3>Headers Inspector</h3>
            {Object.entries(headers).length === 0 ? (
              <pre className={styles.pre}>{pretty(headers)}</pre>
            ) : (
              <details className={styles.headersDetails} open>
                <summary>HTTP Response Headers ({Object.keys(headers).length})</summary>
                <div className={styles.headersList}>
                  {Object.entries(headers).map(([key, value]) => (
                    <details className={styles.headerItem} key={key}>
                      <summary>{key}</summary>
                      <pre className={styles.pre}>{pretty(value)}</pre>
                    </details>
                  ))}
                </div>
              </details>
            )}
          </IosPanel>
        </div>
      </div>
    </div>
  );
}
