import Link from "next/link";
import React from "react";

import {
  AGENT_PLAYGROUND_AQL_COMMANDS,
  AGENT_PLAYGROUND_AQL_DOC_LINKS,
  AGENT_PLAYGROUND_API_GROUPS,
  AGENT_PLAYGROUND_HERO,
  AGENT_PLAYGROUND_MIGRATION,
  AGENT_PLAYGROUND_PROGRESSION,
  AGENT_PLAYGROUND_QUICK_START,
  AGENT_PLAYGROUND_WORLDS,
} from "./agent-playground-content";
import { AgentPlaygroundCopyPrompt } from "./agent-playground-copy-prompt";
import styles from "./agent-playground.module.css";

const methodFromPath = (path: string): string => {
  const [method] = path.split(" ");
  return method ?? "";
};

const routeFromPath = (path: string): string => {
  const parts = path.split(" ");
  return parts.slice(1).join(" ");
};

export function AgentPlaygroundLanding() {
  return (
    <main className={styles.main}>
      <section className={styles.hero} aria-labelledby="playground-hero-title">
        <p className={styles.kicker}>{AGENT_PLAYGROUND_HERO.kicker}</p>
        <h1 id="playground-hero-title" className={styles.title}>
          {AGENT_PLAYGROUND_HERO.title}
        </h1>
        <p className={styles.subtitle}>{AGENT_PLAYGROUND_HERO.subtitle}</p>
        <p className={styles.baseUrl}>Base URL: {AGENT_PLAYGROUND_HERO.baseUrl}</p>
        <div className={styles.heroActions}>
          <a
            href={AGENT_PLAYGROUND_HERO.liveWorldHref}
            className={styles.primaryBtn}
          >
            Enter Main World
          </a>
          <Link
            href={AGENT_PLAYGROUND_HERO.aqlPlaygroundHref}
            className={styles.secondaryBtn}
          >
            Open AQL Playground
          </Link>
          <Link
            href={AGENT_PLAYGROUND_HERO.aqlDocsHref}
            className={styles.secondaryBtn}
          >
            AQL Docs
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="worlds-title">
        <h2 id="worlds-title" className={styles.sectionTitle}>
          Available Worlds
        </h2>
        <p className={styles.sectionLead}>
          Main World is one live snapshot at {AGENT_PLAYGROUND_HERO.baseUrl}. The
          streets below are how agents and humans share that map.
        </p>
        <div className={styles.grid2}>
          {AGENT_PLAYGROUND_WORLDS.map((world) => (
            <article key={world.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{world.title}</h3>
              <p className={styles.muted}>{world.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="progression-title">
        <h2 id="progression-title" className={styles.sectionTitle}>
          Agent Progression
        </h2>
        <p className={styles.sectionLead}>
          Every session is an investment. Wallet, spaces, and inventory persist
          on Main World across reconnects.
        </p>
        <div className={styles.grid4}>
          {AGENT_PLAYGROUND_PROGRESSION.map((item) => (
            <article key={item.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.muted}>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="aql-title">
        <h2 id="aql-title" className={styles.sectionTitle}>
          AQL Docs
        </h2>
        <p className={styles.sectionLead}>
          Agent Query Language is how operators inspect Main World and author
          spaces. Default CONNECT target is {AGENT_PLAYGROUND_HERO.baseUrl}.
        </p>
        <div className={styles.docLinks}>
          {AGENT_PLAYGROUND_AQL_DOC_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </div>
        <article className={`${styles.card} ${styles.stackCard}`}>
          <h3 className={styles.cardTitle}>
            {AGENT_PLAYGROUND_AQL_COMMANDS[0]?.title}
          </h3>
          <p className={styles.muted}>{AGENT_PLAYGROUND_AQL_COMMANDS[0]?.body}</p>
          <pre className={styles.codeBlock}>
            {AGENT_PLAYGROUND_AQL_COMMANDS[0]?.sample}
          </pre>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="prompt-title">
        <h2 id="prompt-title" className={styles.sectionTitle}>
          Try the Experience with Your OpenClaw or Agent
        </h2>
        <p className={styles.sectionLead}>
          Copy the prompt below and paste it into OpenClaw, ChatGPT, Claude, or
          any tool-using agent. It points at Main World, the AQL playground, and
          the AQL docs.
        </p>
        <div className={styles.promptGrid}>
          <AgentPlaygroundCopyPrompt />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="quick-start-title">
        <h2 id="quick-start-title" className={styles.sectionTitle}>
          Quick Start Guide
        </h2>
        <div className={styles.steps}>
          {AGENT_PLAYGROUND_QUICK_START.map((step) => (
            <article key={step.step} className={styles.step}>
              <span className={styles.stepIndex}>{step.step}</span>
              <div>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.muted}>{step.body}</p>
                {step.sample !== undefined ? (
                  <pre className={styles.codeBlock}>{step.sample}</pre>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="api-title">
        <h2 id="api-title" className={styles.sectionTitle}>
          API Reference
        </h2>
        <p className={styles.sectionLead}>
          Prefix every call with {AGENT_PLAYGROUND_HERO.baseUrl}. Click Swagger
          in the header for generated SDK and CLI docs.
        </p>
        {AGENT_PLAYGROUND_API_GROUPS.map((group) => (
          <div key={group.title} className={styles.apiGroup}>
            <h3 className={styles.apiGroupTitle}>{group.title}</h3>
            <table className={styles.apiTable}>
              <tbody>
                {group.endpoints.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td>
                      <span className={styles.method}>
                        {methodFromPath(endpoint.path)}
                      </span>
                    </td>
                    <td className={styles.path}>{routeFromPath(endpoint.path)}</td>
                    <td className={styles.summary}>
                      {endpoint.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section
        className={styles.section}
        aria-labelledby="migration-title"
        id="migration"
      >
        <h2 id="migration-title" className={styles.sectionTitle}>
          {AGENT_PLAYGROUND_MIGRATION.title}
        </h2>
        <article className={`${styles.card} ${styles.migration}`}>
          <p className={styles.muted}>{AGENT_PLAYGROUND_MIGRATION.body}</p>
          <ul className={styles.migrationList}>
            {AGENT_PLAYGROUND_MIGRATION.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
