"use client";

import React, { useState, type FormEvent } from "react";

import {
  AGENT_PLAY_CATALOG,
  AGENT_PLAY_FEATURED_AGENT,
  type AgentPlayFormKind,
  type AgentPlaySitePage,
} from "./agent-play-content";
import {
  AgentPlayAnalyticsPanel,
  AgentPlayCatalog,
  AgentPlayCategoryChips,
  AgentPlayCliOnboarding,
  AgentPlayFeaturedCard,
  AgentPlayHowItWorks,
  AgentPlayInsights,
  AgentPlayMarketplaceStats,
  AgentPlayOrganizationEarning,
  AgentPlayPlayerActions,
  AgentPlayRegisterPromo,
} from "./agent-play-sections";
import { AgentPlayRegisterForm } from "./agent-play-register-form";
import styles from "./agent-play.module.css";

type AgentPlaySubpageProps = {
  page: AgentPlaySitePage;
};

const formSuccessMessage = (kind: AgentPlayFormKind): string => {
  if (kind === "register") {
    return "Your publisher profile request is recorded on this device.";
  }
  if (kind === "login") {
    return "Sign-in is recorded on this device. Publisher workspaces are not connected yet.";
  }
  return "Your message is recorded on this device.";
};

const AgentPlayForm = ({
  kind,
  submitLabel,
}: {
  kind: AgentPlayFormKind;
  submitLabel: string;
}) => {
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(formSuccessMessage(kind));
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {kind === "register" ? (
        <div className={styles.field}>
          <label htmlFor="organizationName">Organization name</label>
          <input id="organizationName" name="organizationName" required />
        </div>
      ) : null}
      {kind === "contact" ? (
        <div className={styles.field}>
          <label htmlFor="fullName">Name</label>
          <input id="fullName" name="fullName" required />
        </div>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      {kind === "login" ? (
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
      ) : null}
      {kind === "register" ? (
        <div className={styles.field}>
          <label htmlFor="website">Website</label>
          <input id="website" name="website" />
        </div>
      ) : null}
      {kind !== "login" ? (
        <div className={styles.field}>
          <label htmlFor="details">
            {kind === "contact" ? "Message" : "About your agents"}
          </label>
          <textarea id="details" name="details" />
        </div>
      ) : null}
      <button type="submit" className={styles.primaryBtn}>
        {submitLabel}
      </button>
      {message !== null ? <p className={styles.success}>{message}</p> : null}
    </form>
  );
};

const AgentPlayArticle = ({ page }: { page: AgentPlaySitePage }) => {
  return (
    <>
      {(page.sections ?? []).map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <p className={styles.articleBody}>{section.body}</p>
          {section.bullets !== undefined ? (
            <ul className={styles.checkList}>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
};

export function AgentPlaySubpage({ page }: AgentPlaySubpageProps) {
  return (
    <main className={styles.main}>
      <p className={styles.kicker}>{page.kicker}</p>
      <h1 className={styles.title}>{page.title}</h1>
      <p className={styles.lead}>{page.lead}</p>

      {page.kind === "marketplace" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Featured Agent</h2>
            <AgentPlayFeaturedCard agent={AGENT_PLAY_FEATURED_AGENT} />
          </section>
          <section className={styles.section}>
            <AgentPlayAnalyticsPanel />
          </section>
          <section className={styles.section}>
            <AgentPlayRegisterPromo />
          </section>
          <section className={styles.section}>
            <AgentPlayMarketplaceStats />
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Browse Agents</h2>
            <AgentPlayCatalog agents={AGENT_PLAY_CATALOG} />
          </section>
        </>
      ) : null}

      {page.kind === "agents" ? (
        <section className={styles.section}>
          <AgentPlayCatalog agents={AGENT_PLAY_CATALOG} />
        </section>
      ) : null}

      {page.kind === "categories" ? (
        <section className={styles.section}>
          <AgentPlayCategoryChips />
        </section>
      ) : null}

      {page.kind === "analytics" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Actionable Marketplace Analytics
            </h2>
            <AgentPlayAnalyticsPanel />
          </section>
          <section className={styles.section}>
            <AgentPlayInsights />
          </section>
        </>
      ) : null}

      {page.kind === "how-it-works" ? (
        <>
          <section className={styles.section}>
            <AgentPlayHowItWorks />
          </section>
          <section className={styles.section}>
            <AgentPlayCliOnboarding />
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What players can do</h2>
            <AgentPlayPlayerActions />
          </section>
          <section className={styles.section}>
            <AgentPlayOrganizationEarning />
          </section>
        </>
      ) : null}

      {page.kind === "article" ? <AgentPlayArticle page={page} /> : null}

      {page.kind === "form" && page.formKind === "register" ? (
        <section className={styles.section}>
          <AgentPlayRegisterForm submitLabel={page.title} />
        </section>
      ) : null}

      {page.kind === "form" &&
      page.formKind !== undefined &&
      page.formKind !== "register" ? (
        <section className={styles.section}>
          <AgentPlayForm
            kind={page.formKind}
            submitLabel={page.title}
          />
        </section>
      ) : null}
    </main>
  );
}
