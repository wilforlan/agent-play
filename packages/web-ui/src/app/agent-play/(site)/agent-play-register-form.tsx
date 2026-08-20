"use client";

import React, { useState, type FormEvent } from "react";
import Link from "next/link";

import {
  AGENT_PLAY_CLI_ONBOARDING,
  AGENT_PLAY_ORGANIZATION_EARNING,
} from "./agent-play-content";
import {
  AgentPlayCliOnboarding,
  AgentPlayOrganizationEarning,
  AgentPlayPlayerActions,
} from "./agent-play-sections";
import styles from "./agent-play.module.css";

type OrganizationCredentialsFile = {
  serverUrl: string;
  nodeId: string;
  passw: string;
};

type RegisterOrganizationResponse = {
  credentials: OrganizationCredentialsFile;
  nextSteps: {
    cliDocHref: string;
    initializeDocHref: string;
    installCommand: string;
  };
};

const isCredentialsFile = (
  value: unknown,
): value is OrganizationCredentialsFile => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as {
    serverUrl?: unknown;
    nodeId?: unknown;
    passw?: unknown;
  };
  return (
    typeof row.serverUrl === "string" &&
    typeof row.nodeId === "string" &&
    typeof row.passw === "string"
  );
};

const parseRegisterResponse = (
  value: unknown,
): RegisterOrganizationResponse | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as {
    credentials?: unknown;
    nextSteps?: {
      cliDocHref?: unknown;
      initializeDocHref?: unknown;
      installCommand?: unknown;
    };
  };
  if (!isCredentialsFile(row.credentials)) {
    return null;
  }
  if (
    typeof row.nextSteps?.cliDocHref !== "string" ||
    typeof row.nextSteps.initializeDocHref !== "string" ||
    typeof row.nextSteps.installCommand !== "string"
  ) {
    return null;
  }
  return {
    credentials: row.credentials,
    nextSteps: {
      cliDocHref: row.nextSteps.cliDocHref,
      initializeDocHref: row.nextSteps.initializeDocHref,
      installCommand: row.nextSteps.installCommand,
    },
  };
};

const credentialsHref = (credentials: OrganizationCredentialsFile): string => {
  const json = JSON.stringify(credentials, null, 2);
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
};

export function AgentPlayRegisterForm({ submitLabel }: { submitLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegisterOrganizationResponse | null>(
    null,
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const organizationName = String(data.get("organizationName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const website = String(data.get("website") ?? "").trim();
    const details = String(data.get("details") ?? "").trim();
    setError(null);
    setBusy(true);
    void (async () => {
      try {
        const response = await fetch("/api/agent-play/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationName,
            email,
            ...(website.length > 0 ? { website } : {}),
            ...(details.length > 0 ? { details } : {}),
          }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Organization registration failed";
          setError(message);
          return;
        }
        const parsed = parseRegisterResponse(payload);
        if (parsed === null) {
          setError("Organization registration failed");
          return;
        }
        setResult(parsed);
      } catch {
        setError("Organization registration failed");
      } finally {
        setBusy(false);
      }
    })();
  };

  if (result !== null) {
    return (
      <div className={styles.section}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Download your node credential</h2>
          <p className={styles.muted}>
            This passphrase is shown once. Save credentials.json as
            ~/.agent-play/credentials.json before you leave this page.
          </p>
          <p className={styles.agentMeta}>Node {result.credentials.nodeId}</p>
          <pre className={styles.codeBlock}>{result.credentials.passw}</pre>
          <div className={styles.actions}>
            <a
              className={styles.primaryBtn}
              href={credentialsHref(result.credentials)}
              download="credentials.json"
            >
              Download credentials.json
            </a>
            <Link
              href={result.nextSteps.cliDocHref}
              className={styles.secondaryBtn}
            >
              Open CLI docs
            </Link>
          </div>
        </section>
        <section className={styles.section}>
          <AgentPlayCliOnboarding />
        </section>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How Agent Play works</h2>
          <p className={styles.sectionLead}>
            Players can perform talk, chat, and assist actions with the agents
            you host. Assist can continue as background tasks.
          </p>
          <AgentPlayPlayerActions />
        </section>
        <section className={styles.section}>
          <AgentPlayOrganizationEarning />
        </section>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor="organizationName">Organization name</label>
        <input id="organizationName" name="organizationName" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" />
      </div>
      <div className={styles.field}>
        <label htmlFor="details">About your agents</label>
        <textarea id="details" name="details" />
      </div>
      <button type="submit" className={styles.primaryBtn} disabled={busy}>
        {busy ? "Creating organization…" : submitLabel}
      </button>
      {error !== null ? <p className={styles.formError}>{error}</p> : null}
      <p className={styles.muted}>
        Next: download credentials, then follow{" "}
        <Link href={AGENT_PLAY_CLI_ONBOARDING.cliDocHref}>CLI setup</Link> and{" "}
        {AGENT_PLAY_ORGANIZATION_EARNING.title.toLowerCase()}.
      </p>
    </form>
  );
}
