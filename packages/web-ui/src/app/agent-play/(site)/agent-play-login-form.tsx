"use client";

import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";
import React, { useState, type ChangeEvent, type FormEvent } from "react";

import { AGENT_PLAY_LOGIN_WORKSPACE } from "./agent-play-content";
import { AgentPlayFirstAgentGuide } from "./agent-play-sections";
import styles from "./agent-play.module.css";

type PublisherCredentials = {
  nodeId: string;
  passw: string;
};

type WorkspaceAgent = {
  agentId: string;
  name: string;
  yieldCount: number;
  zoneCount: number;
  flagged: boolean;
  hosted: boolean;
};

type PublisherWorkspace = {
  nodeId: string;
  passwHash: string;
  agents: WorkspaceAgent[];
};

const parsePublisherCredentials = (
  value: unknown,
): PublisherCredentials | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as { nodeId?: unknown; passw?: unknown };
  if (typeof row.nodeId !== "string" || typeof row.passw !== "string") {
    return null;
  }
  const nodeId = row.nodeId.trim();
  const passw = row.passw.trim();
  if (nodeId.length === 0 || passw.length === 0) {
    return null;
  }
  return { nodeId, passw };
};

const isWorkspaceAgentRecord = (
  value: unknown,
): value is {
  agentId: string;
  name: string;
  yieldCount: number;
  zoneCount: number;
  flagged: boolean;
} => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as {
    agentId?: unknown;
    name?: unknown;
    yieldCount?: unknown;
    zoneCount?: unknown;
    flagged?: unknown;
  };
  return (
    typeof row.agentId === "string" &&
    typeof row.name === "string" &&
    typeof row.yieldCount === "number" &&
    typeof row.zoneCount === "number" &&
    typeof row.flagged === "boolean"
  );
};

const parseWorkspacePayload = (
  value: unknown,
  passwHash: string,
): PublisherWorkspace | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as {
    mainNode?: {
      nodeId?: unknown;
      agentNodeIds?: unknown;
    };
    agentNodes?: unknown;
  };
  if (typeof row.mainNode?.nodeId !== "string") {
    return null;
  }
  const runtime = Array.isArray(row.agentNodes)
    ? row.agentNodes.filter(isWorkspaceAgentRecord)
    : [];
  const attachedIds = Array.isArray(row.mainNode.agentNodeIds)
    ? row.mainNode.agentNodeIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];
  const byId = new Map(runtime.map((agent) => [agent.agentId, agent]));
  const ids = [...new Set([...attachedIds, ...runtime.map((agent) => agent.agentId)])];
  const agents = ids.map((agentId) => {
    const hosted = byId.get(agentId);
    if (hosted === undefined) {
      return {
        agentId,
        name: agentId,
        yieldCount: 0,
        zoneCount: 0,
        flagged: false,
        hosted: false,
      };
    }
    return { ...hosted, hosted: true };
  });

  return {
    nodeId: row.mainNode.nodeId,
    passwHash,
    agents,
  };
};

const authHeaders = (
  nodeId: string,
  passwHash: string,
): Record<string, string> => {
  return {
    "content-type": "application/json",
    "x-node-id": nodeId,
    "x-node-passw": passwHash,
  };
};

const totalYield = (agents: readonly WorkspaceAgent[]): number => {
  return agents.reduce((sum, agent) => sum + agent.yieldCount, 0);
};

export function AgentPlayLoginForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<PublisherWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    setFileName(file?.name ?? null);
    setError(null);
  };

  const loadWorkspace = async (
    nodeId: string,
    passwHash: string,
  ): Promise<boolean> => {
    const nodesResponse = await fetch(AGENT_PLAY_LOGIN_WORKSPACE.nodesHref, {
      headers: authHeaders(nodeId, passwHash),
    });
    const nodesPayload: unknown = await nodesResponse.json();
    if (!nodesResponse.ok) {
      setError("Publisher workspace could not be loaded");
      return false;
    }
    const nextWorkspace = parseWorkspacePayload(nodesPayload, passwHash);
    if (nextWorkspace === null) {
      setError("Publisher workspace could not be loaded");
      return false;
    }
    setWorkspace(nextWorkspace);
    return true;
  };

  const onRestore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("credentialsFile");
    const file =
      input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (file === undefined) {
      setError("Upload credentials.json first");
      return;
    }
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const parsed = parsePublisherCredentials(JSON.parse(await file.text()));
        if (parsed === null) {
          setError("Invalid credentials.json");
          return;
        }
        const passwHash = nodeCredentialsMaterialFromHumanPassphrase(
          parsed.passw,
        );
        const validateResponse = await fetch(
          AGENT_PLAY_LOGIN_WORKSPACE.validateHref,
          {
            method: "POST",
            headers: authHeaders(parsed.nodeId, passwHash),
            body: JSON.stringify({ nodeId: parsed.nodeId }),
          },
        );
        const validatePayload: unknown = await validateResponse.json();
        const ok =
          typeof validatePayload === "object" &&
          validatePayload !== null &&
          "ok" in validatePayload &&
          validatePayload.ok === true;
        if (!validateResponse.ok || !ok) {
          setError("Those credentials were not accepted");
          return;
        }
        await loadWorkspace(parsed.nodeId, passwHash);
      } catch {
        setError("Those credentials were not accepted");
      } finally {
        setBusy(false);
      }
    })();
  };

  const onDeleteAgent = (agentId: string) => {
    if (workspace === null) {
      return;
    }
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(
          `${AGENT_PLAY_LOGIN_WORKSPACE.agentsHref}?id=${encodeURIComponent(agentId)}`,
          {
            method: "DELETE",
            headers: authHeaders(workspace.nodeId, workspace.passwHash),
          },
        );
        if (!response.ok) {
          setError("The agent could not be removed");
          return;
        }
        await loadWorkspace(workspace.nodeId, workspace.passwHash);
      } catch {
        setError("The agent could not be removed");
      } finally {
        setBusy(false);
      }
    })();
  };

  if (workspace !== null) {
    const yieldTotal = totalYield(workspace.agents);
    return (
      <>
        <section
          className={`${styles.section} ${styles.formShell}`}
          aria-labelledby="workspace-title"
        >
          <div className={styles.sectionHeader}>
            <h2 id="workspace-title" className={styles.sectionTitle}>
              {AGENT_PLAY_LOGIN_WORKSPACE.manageTitle}
            </h2>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                setWorkspace(null);
                setFileName(null);
              }}
            >
              {AGENT_PLAY_LOGIN_WORKSPACE.signOutCta}
            </button>
          </div>
          <p className={styles.muted}>Main node {workspace.nodeId}</p>
        </section>

        <section
          className={styles.section}
          aria-labelledby="earnings-title"
        >
          <h2 id="earnings-title" className={styles.sectionTitle}>
            {AGENT_PLAY_LOGIN_WORKSPACE.earningsTitle}
          </h2>
          <p className={styles.sectionLead}>
            {AGENT_PLAY_LOGIN_WORKSPACE.earningsLead}
          </p>
          <div className={styles.stats} role="list">
            <div className={styles.statCard} role="listitem">
              <span className={styles.statValue}>{String(yieldTotal)}</span>
              <span className={styles.statLabel}>
                {AGENT_PLAY_LOGIN_WORKSPACE.yieldLabel}
              </span>
            </div>
            <div className={styles.statCard} role="listitem">
              <span className={styles.statValue}>
                {String(workspace.agents.length)}
              </span>
              <span className={styles.statLabel}>
                {AGENT_PLAY_LOGIN_WORKSPACE.agentsTitle}
              </span>
            </div>
          </div>
        </section>

        <section
          className={styles.section}
          aria-labelledby="workspace-agents-title"
        >
          <h2 id="workspace-agents-title" className={styles.sectionTitle}>
            {AGENT_PLAY_LOGIN_WORKSPACE.agentsTitle}
          </h2>
          {workspace.agents.length === 0 ? (
            <p className={styles.empty}>
              {AGENT_PLAY_LOGIN_WORKSPACE.agentsEmpty}
            </p>
          ) : (
            <div className={styles.agentGrid}>
              {workspace.agents.map((agent) => (
                <article key={agent.agentId} className={styles.agentCard}>
                  <span className={styles.badge}>
                    {agent.hosted ? "Hosted" : "Node"}
                  </span>
                  <h3 className={styles.agentName}>{agent.name}</h3>
                  <p className={styles.agentMeta}>{agent.agentId}</p>
                  <p className={styles.agentMeta}>
                    {AGENT_PLAY_LOGIN_WORKSPACE.yieldLabel} {agent.yieldCount}
                  </p>
                  <p className={styles.agentMeta}>
                    {AGENT_PLAY_LOGIN_WORKSPACE.zonesLabel} {agent.zoneCount}
                  </p>
                  {agent.flagged ? (
                    <p className={styles.formError}>Flagged</p>
                  ) : null}
                  {agent.hosted ? (
                    <div className={styles.agentActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={busy}
                        onClick={() => onDeleteAgent(agent.agentId)}
                      >
                        {AGENT_PLAY_LOGIN_WORKSPACE.deleteAgentCta}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        {error !== null ? <p className={styles.formError}>{error}</p> : null}
        <AgentPlayFirstAgentGuide />
      </>
    );
  }

  return (
    <>
      <section className={`${styles.section} ${styles.formShell}`}>
        <form className={styles.form} onSubmit={onRestore}>
          <div className={styles.field}>
            <label htmlFor="credentialsFile">
              {AGENT_PLAY_LOGIN_WORKSPACE.uploadLabel}
            </label>
            <input
              id="credentialsFile"
              name="credentialsFile"
              type="file"
              accept="application/json,.json"
              onChange={onFileChange}
            />
          </div>
          <p className={styles.muted}>{AGENT_PLAY_LOGIN_WORKSPACE.uploadHelp}</p>
          {fileName !== null ? (
            <p className={styles.agentMeta}>{fileName}</p>
          ) : null}
          <button type="submit" className={styles.primaryBtn} disabled={busy}>
            {busy
              ? "Opening workspace…"
              : AGENT_PLAY_LOGIN_WORKSPACE.restoreCta}
          </button>
          {error !== null ? <p className={styles.formError}>{error}</p> : null}
        </form>
      </section>
      <AgentPlayFirstAgentGuide />
    </>
  );
}
