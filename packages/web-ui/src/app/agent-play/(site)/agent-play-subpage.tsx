"use client";

import React, { useState, type FormEvent } from "react";

import {
  AGENT_PLAY_CATALOG,
  AGENT_PLAY_FEATURED_AGENT,
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
import { AgentPlayLoginForm } from "./agent-play-login-form";
import { AgentPlayOrganizationsSection } from "./agent-play-organizations-section";
import styles from "./agent-play.module.css";

type AgentPlaySubpageProps = {
  page: AgentPlaySitePage;
};

const AgentPlayContactForm = ({ submitLabel }: { submitLabel: string }) => {
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Your message is recorded on this device.");
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor="fullName">Name</label>
        <input id="fullName" name="fullName" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="details">Message</label>
        <textarea id="details" name="details" />
      </div>
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
        <section key={section.title} className={`${styles.section} ${styles.articlePanel}`}>
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
      <header className={styles.pageMasthead}>
        <p className={styles.kicker}>{page.kicker}</p>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.lead}>{page.lead}</p>
      </header>

      {page.kind === "marketplace" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Featured Agent</h2>
            <AgentPlayFeaturedCard agent={AGENT_PLAY_FEATURED_AGENT} />
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
        <>
          <AgentPlayOrganizationsSection />
          <section className={styles.section}>
            <AgentPlayCatalog agents={AGENT_PLAY_CATALOG} />
          </section>
        </>
      ) : null}

      {page.kind === "categories" ? (
        <>
          <section className={styles.section}>
            <AgentPlayCategoryChips />
          </section>
          <AgentPlayOrganizationsSection />
        </>
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
        <section className={`${styles.section} ${styles.formShell}`}>
          <AgentPlayRegisterForm submitLabel={page.title} />
        </section>
      ) : null}

      {page.kind === "form" && page.formKind === "login" ? (
        <AgentPlayLoginForm />
      ) : null}

      {page.kind === "form" && page.formKind === "contact" ? (
        <section className={`${styles.section} ${styles.formShell}`}>
          <AgentPlayContactForm submitLabel={page.title} />
        </section>
      ) : null}
    </main>
  );
}
