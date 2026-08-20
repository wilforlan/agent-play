"use client";

import React, { useEffect, useState } from "react";

import { AGENT_PLAY_ORGANIZATIONS_SECTION } from "./agent-play-content";
import styles from "./agent-play.module.css";

type PublicOrganizationListing = {
  nodeId: string;
  organizationName: string;
  website: string;
  details: string;
  createdAt: string;
};

const isPublicOrganizationListing = (
  value: unknown,
): value is PublicOrganizationListing => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as {
    nodeId?: unknown;
    organizationName?: unknown;
    website?: unknown;
    details?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof row.nodeId === "string" &&
    typeof row.organizationName === "string" &&
    typeof row.website === "string" &&
    typeof row.details === "string" &&
    typeof row.createdAt === "string"
  );
};

const parseOrganizationsPayload = (
  value: unknown,
): PublicOrganizationListing[] | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as { organizations?: unknown };
  if (!Array.isArray(row.organizations)) {
    return null;
  }
  if (!row.organizations.every(isPublicOrganizationListing)) {
    return null;
  }
  return row.organizations;
};

const websiteHref = (website: string): string | null => {
  if (website.length === 0) {
    return null;
  }
  if (website.startsWith("http://") || website.startsWith("https://")) {
    return website;
  }
  return `https://${website}`;
};

export function AgentPlayOrganizationsSection() {
  const [organizations, setOrganizations] = useState<
    PublicOrganizationListing[] | null
  >(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(AGENT_PLAY_ORGANIZATIONS_SECTION.listHref);
        const payload: unknown = await response.json();
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(true);
          return;
        }
        const parsed = parseOrganizationsPayload(payload);
        if (parsed === null) {
          setError(true);
          return;
        }
        setOrganizations(parsed);
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className={styles.section}
      aria-labelledby="organizations-title"
    >
      <div className={styles.sectionHeader}>
        <h2 id="organizations-title" className={styles.sectionTitle}>
          {AGENT_PLAY_ORGANIZATIONS_SECTION.title}
        </h2>
      </div>
      <p className={styles.sectionLead}>
        {AGENT_PLAY_ORGANIZATIONS_SECTION.lead}
      </p>
      {error ? (
        <p className={styles.formError}>{AGENT_PLAY_ORGANIZATIONS_SECTION.error}</p>
      ) : null}
      {organizations === null && !error ? (
        <p className={styles.muted}>{AGENT_PLAY_ORGANIZATIONS_SECTION.loading}</p>
      ) : null}
      {organizations !== null && organizations.length === 0 ? (
        <p className={styles.empty}>{AGENT_PLAY_ORGANIZATIONS_SECTION.empty}</p>
      ) : null}
      {organizations !== null && organizations.length > 0 ? (
        <div className={styles.agentGrid}>
          {organizations.map((organization) => {
            const href = websiteHref(organization.website);
            return (
              <article key={organization.nodeId} className={styles.agentCard}>
                <span className={styles.badge}>Publisher</span>
                <h3 className={styles.agentName}>
                  {organization.organizationName}
                </h3>
                {organization.details.length > 0 ? (
                  <p className={styles.muted}>{organization.details}</p>
                ) : null}
                {href !== null ? (
                  <a
                    href={href}
                    className={styles.navLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {organization.website}
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
